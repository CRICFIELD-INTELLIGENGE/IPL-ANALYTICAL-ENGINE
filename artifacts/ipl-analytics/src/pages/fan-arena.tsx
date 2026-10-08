import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { useTeamTheme, type TeamCode } from "@/lib/team-context";
import {
  Shield, Trophy, Users, MessageSquare, Gavel, BarChart2,
  Sparkles, Flame, Clock, Radio, Award, Heart, CheckCircle2,
  ChevronRight, ArrowRight, Share2, Compass, Search, Filter,
  Send, ThumbsUp, Star, Layers, Zap, Crosshair, BookOpen, AlertCircle,
  Play, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BroadcasterLink } from "@/components/broadcaster-link";
import { AdVessel } from "@/components/ad-vessel";
import { VideoShelf } from "@/components/video-shelf";
import { VideoArchiveModal } from "@/components/video-archive-modal";
import { getEditorialShelves } from "@/lib/video-registry";

// 3 COMMUNITY PARTICIPATION IDENTITIES
type FanIdentity = "fan" | "analyst" | "selector";

interface IdentityProfile {
  id: FanIdentity;
  title: string;
  tagline: string;
  badge: string;
  color: string;
  accentBg: string;
  borderColor: string;
  description: string;
  capabilities: string[];
  cta: string;
}

const IDENTITIES: Record<FanIdentity, IdentityProfile> = {
  fan: {
    id: "fan",
    title: "The Fan",
    tagline: "Loyalty, Community, and Stadium Emotion",
    badge: "IDENTITY 01",
    color: "text-amber-400",
    accentBg: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    description: "Votes on captaincy and retentions, debates in rivalries, collects digital player cards, and preserves memories in the Story Vault.",
    capabilities: [
      "Franchise Dugout Loyalty & Crest Customization",
      "Live Fan Parliament Poll Voting",
      "Digital Cardverse Deck Building & Battles",
      "Cricket Story Vault Submissions & Memorials"
    ],
    cta: "Explore Dugout Experience"
  },
  analyst: {
    id: "analyst",
    title: "The Analyst",
    tagline: "Data Evidence, Multiverse Simulations, and Fact-Checking",
    badge: "IDENTITY 02",
    color: "text-cyan-400",
    accentBg: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    description: "Investigates claims, discovers statistical anomalies, replays historic turning points, and balances popular opinion against 280,000+ balls of data.",
    capabilities: [
      "280,000+ Ball Multidimensional Slicing",
      "Alternate Universe Monte Carlo Divergence",
      "Opponent Exploit Dossiers & Pressure Genome",
      "Community Intelligence Fact-Checking Engine"
    ],
    cta: "Open Analyst Terminal"
  },
  selector: {
    id: "selector",
    title: "The Selector",
    tagline: "War Room Tactics, Purse Management, and Squad Balance",
    badge: "IDENTITY 03",
    color: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    description: "Commands a ₹120.00 Cr purse in the Auction War Room, designs playing XIs under pitch constraints, and scouts underrated domestic gems.",
    capabilities: [
      "Live Mega-Auction Simulator with 9 Bot Franchises",
      "Playing XI Optimizer with Venue Constraints",
      "Scout Lab Underrated Player Nominations",
      "Multiplayer Private Auction Rooms with Friends"
    ],
    cta: "Enter Auction War Room"
  }
};

// 12 FEATURES CATALOGUE
interface BeyondFeature {
  num: string;
  title: string;
  subtitle: string;
  badge: string;
  category: "belong" | "discover" | "play";
  description: string;
  status: "LIVE NOW" | "EXPANDED BETA" | "ROADMAP";
  href: string;
  actionLabel: string;
  stats: { label: string; value: string }[];
  tags: string[];
}

const TWELVE_FEATURES: BeyondFeature[] = [
  {
    num: "01",
    title: "My Dugout",
    subtitle: "Your cricket identity",
    badge: "FAN IDENTITY",
    category: "belong",
    description: "Select your franchise and enter a personalized hub. Home feed, era timeline (2008–2026), loyalty rewards, and rival tracking adapt to your club.",
    status: "LIVE NOW",
    href: "/dugout",
    actionLabel: "Enter My Dugout →",
    stats: [
      { label: "Franchises", value: "10 Supported" },
      { label: "Eras", value: "2008–2026" },
      { label: "Personalized", value: "Theme & Intel" }
    ],
    tags: ["#Identity", "#DugoutHub", "#FranchiseLoyalty"]
  },
  {
    num: "02",
    title: "Auction War Room",
    subtitle: "Become the selector",
    badge: "SIMULATION",
    category: "play",
    description: "Command a ₹120.00 Cr purse against 9 strategic AI bots. Formulate bid ceilings, acquire marquee players, and invite friends into multiplayer war rooms.",
    status: "LIVE NOW",
    href: "/auction",
    actionLabel: "Launch Auction OS →",
    stats: [
      { label: "Purse Cap", value: "₹120.00 Cr" },
      { label: "AI Competitors", value: "9 Franchises" },
      { label: "Modes", value: "Solo & Multiplayer" }
    ],
    tags: ["#AuctionWarRoom", "#BidStrategy", "#SelectorMode"]
  },
  {
    num: "03",
    title: "Fan Parliament",
    subtitle: "The public decides with data",
    badge: "GOVERNANCE",
    category: "belong",
    description: "Franchise-specific polls on captaincy, retentions, and strategy. Unlike Twitter polls, public consensus is contrasted side-by-side with hard data evidence.",
    status: "LIVE NOW",
    href: "/dugout#parliament",
    actionLabel: "Cast Parliament Vote →",
    stats: [
      { label: "Active Polls", value: "10 Franchises" },
      { label: "Verification", value: "Data Evidence Drawer" },
      { label: "Participation", value: "48K+ Votes" }
    ],
    tags: ["#FanParliament", "#PublicMandate", "#DataEvidence"]
  },
  {
    num: "04",
    title: "Second Screen",
    subtitle: "Watch cricket differently",
    badge: "MATCH ENGINE",
    category: "play",
    description: "Interactive second screen synced with official JioHotstar broadcasts and archives. Track live momentum, win probabilities, and debate on-field decisions.",
    status: "LIVE NOW",
    href: "/pulse",
    actionLabel: "Open Second Screen →",
    stats: [
      { label: "Broadcaster Sync", value: "JioHotstar Links" },
      { label: "Live Telemetry", value: "Win Prob & Heat" },
      { label: "Tactical Splits", value: "Over-by-Over" }
    ],
    tags: ["#SecondScreen", "#JioHotstarSync", "#LiveCompanion"]
  },
  {
    num: "05",
    title: "Cardverse",
    subtitle: "Collect cricket intelligence",
    badge: "COLLECTIBLES",
    category: "play",
    description: "Digital and physical player cards driven by real performance stats. Build tactical XI decks, compare radar profiles, and compete in stat showdowns.",
    status: "LIVE NOW",
    href: "/shop",
    actionLabel: "Explore Cardverse Deck →",
    stats: [
      { label: "Card Decks", value: "Playing XI & Rivalry" },
      { label: "Tactical Specs", value: "11 Foil Cards" },
      { label: "Integration", value: "Unlocks Pro Hub" }
    ],
    tags: ["#Cardverse", "#StatBattles", "#TacticalDeck"]
  },
  {
    num: "06",
    title: "Fan Clubs",
    subtitle: "Communities within communities",
    badge: "COMMUNITY",
    category: "belong",
    description: "Private and public supporter circles around cities, colleges, and franchises (e.g., RCB 12th Man Army, Whistle Podu Brigade, Paltan Network) with private debate boards.",
    status: "EXPANDED BETA",
    href: "/dugout",
    actionLabel: "Join Fan Clubs →",
    stats: [
      { label: "Clubs", value: "10 Official Hubs" },
      { label: "Debates", value: "Moderated Topics" },
      { label: "Rewards", value: "Reputation Points" }
    ],
    tags: ["#FanClubs", "#CityCircles", "#SupporterTribes"]
  },
  {
    num: "07",
    title: "Cricket Time Machine",
    subtitle: "Replay iconic turning points",
    badge: "MONTE CARLO",
    category: "discover",
    description: "Replay historic IPL seasons and finals across 1,000 parallel Monte Carlo runs. Change one decision (e.g., Bumrah bowling Mohit's over) and isolate true causality.",
    status: "LIVE NOW",
    href: "/ai-analyst/alt-universe",
    actionLabel: "Launch Time Machine →",
    stats: [
      { label: "Simulations", value: "1,000 Runs/Match" },
      { label: "Matches", value: "1,240+ Seasons" },
      { label: "Divergence", value: "Worm Tracking" }
    ],
    tags: ["#TimeMachine", "#AltUniverse", "#WhatIfEngine"]
  },
  {
    num: "08",
    title: "Rivalry Arena",
    subtitle: "The great cricket debates",
    badge: "HEAD TO HEAD",
    category: "belong",
    description: "RCB vs CSK, MI vs CSK, Kohli vs Rohit. Fans debate with interactive charts, comparative trophy cases, and head-to-head match histories.",
    status: "LIVE NOW",
    href: "/dugout#rivalry",
    actionLabel: "Enter Rivalry Arena →",
    stats: [
      { label: "Epic Battles", value: "CSK-MI, RCB-CSK" },
      { label: "Metrics", value: "H2H Win %, Finals" },
      { label: "Public Vote", value: "Live Debate Standings" }
    ],
    tags: ["#RivalryArena", "#HeadToHead", "#ElClasico"]
  },
  {
    num: "09",
    title: "Scout Lab",
    subtitle: "Discover underrated domestic gems",
    badge: "SCOUTING",
    category: "discover",
    description: "Fans submit scouting reports on uncapped talents and high-leverage underdogs. Upvote talent dossiers with verifiable strike-rate and economy metrics.",
    status: "EXPANDED BETA",
    href: "/stats",
    actionLabel: "Scout Emerging Talent →",
    stats: [
      { label: "Database", value: "700+ Players" },
      { label: "Focus", value: "Uncapped & Impact" },
      { label: "Verification", value: "Ball-by-Ball Logs" }
    ],
    tags: ["#ScoutLab", "#DomesticTalent", "#UncappedGems"]
  },
  {
    num: "10",
    title: "Fan Reputation",
    subtitle: "Rewarding insight over noise",
    badge: "CREDENTIALS",
    category: "belong",
    description: "An algorithm rewarding accurate match forecasts, insightful analytical posts, and constructive debate participation instead of spam volume.",
    status: "EXPANDED BETA",
    href: "/dugout",
    actionLabel: "View Reputation Rank →",
    stats: [
      { label: "Tiers", value: "Scout → Grand Selector" },
      { label: "Scoring", value: "Prediction IQ Metric" },
      { label: "Badges", value: "Verifiable Accuracy" }
    ],
    tags: ["#FanReputation", "#PredictiveIQ", "#Credibility"]
  },
  {
    num: "11",
    title: "Cricket Story Vault",
    subtitle: "A community history archive",
    badge: "MEMORIES",
    category: "belong",
    description: "Fans share stadium memories, ticket stubs, first jerseys, and unforgettable boundary finishes, creating an emotional living museum of Indian cricket.",
    status: "EXPANDED BETA",
    href: "/insights",
    actionLabel: "Read Story Vault →",
    stats: [
      { label: "Stories", value: "Community Archive" },
      { label: "Categories", value: "Stadium Lore & Finals" },
      { label: "Moderation", value: "Peer Upvoted" }
    ],
    tags: ["#StoryVault", "#StadiumMemories", "#LivingMuseum"]
  },
  {
    num: "12",
    title: "Community Intelligence",
    subtitle: "Fan consensus vs statistical reality",
    badge: "AGGREGATE QUANT",
    category: "discover",
    description: "Aggregates anonymous fan expectations and contrasts them with machine-learning forecasts. Shows where emotion clouds judgment and where fans outsmart the models.",
    status: "LIVE NOW",
    href: "/ai-analyst/feed",
    actionLabel: "Inspect Community Bias →",
    stats: [
      { label: "Bias Delta", value: "Fan Optimism Index" },
      { label: "Model Baseline", value: "ML Win Forecasts" },
      { label: "Updates", value: "Daily Telemetry" }
    ],
    tags: ["#CommunityIntel", "#FanExpectations", "#QuantContrast"]
  }
];

// LIVE COMMUNITY INTELLIGENCE CONTRAST SAMPLE
const COMMUNITY_SAMPLE = {
  question: "Will RCB successfully defend their IPL title in 2027?",
  fanExpectation: 68, // 68% Fans Say Yes
  modelProbability: 24.5, // Historical repeat probability is 24.5%
  deltaInsight: "Fan optimism outpaces statistical odds by +43.5%. While fan sentiment anticipates an unprecedented dynasty, data shows only 2 franchises in 18 seasons have defended a maiden title.",
  keyFactor: "Death-overs pace retention and bowling economy in overs 16–20 at Chinnaswamy."
};

// SCOUT LAB EMERGING GEMS DATA
const SCOUT_GEMS = [
  {
    name: "Ashutosh Sharma",
    role: "Death Overs Finisher",
    franchise: "PBKS",
    stat: "214.3 SR in Overs 17–20",
    scoutNote: "Unprecedented trigger movement and pick-up off express pace under high pressure.",
    upvotes: 412
  },
  {
    name: "Mayank Yadav",
    role: "Express Seamer",
    franchise: "LSG",
    stat: "156.7 km/h Top Velocity",
    scoutNote: "Steep bounce and unhittable heavy length against top-order international bats.",
    upvotes: 890
  },
  {
    name: "Abhishek Sharma",
    role: "Boundary Accelerator",
    franchise: "SRH",
    stat: "204.8 Powerplay SR",
    scoutNote: "Revolutionized first 6 overs with zero dot-ball tolerance against spin and pace.",
    upvotes: 674
  }
];

export default function FanArenaPage() {
  const { selectedTeam, theme } = useTeamTheme();
  const [selectedIdentity, setSelectedIdentity] = useState<FanIdentity>("fan");
  const [filterCategory, setFilterCategory] = useState<"all" | "belong" | "discover" | "play">("all");
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);

  // Scout upvote tracker
  const [upvotes, setUpvotes] = useState<Record<string, number>>({
    "Ashutosh Sharma": 412,
    "Mayank Yadav": 890,
    "Abhishek Sharma": 674
  });
  const [hasUpvoted, setHasUpvoted] = useState<Record<string, boolean>>({});

  const handleUpvote = (name: string) => {
    if (hasUpvoted[name]) return;
    setUpvotes(prev => ({ ...prev, [name]: prev[name] + 1 }));
    setHasUpvoted(prev => ({ ...prev, [name]: true }));
  };

  const filteredFeatures = TWELVE_FEATURES.filter(f => {
    if (filterCategory === "all") return true;
    return f.category === filterCategory;
  });

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const editorialShelves = useMemo(() => getEditorialShelves(), []);

  const activeIdentityData = IDENTITIES[selectedIdentity];

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-12">

        {/* ═══════════════════════════════════════════════════════════════════
            1. BEYOND XI HERO VISION & PILLARS
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#0B1224] via-[#070B18] to-[#04060E] border border-amber-500/30 p-8 sm:p-12 overflow-hidden shadow-2xl">
          {/* Ambient lighting */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                THE PARTICIPATORY CRICKET PLATFORM
              </span>
              <span className="text-[11px] font-mono text-white/50 tracking-wider">
                Beyond XI Operating System
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-none">
              Beyond the scoreboard. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400">
                Inside the game.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-white/70 max-w-2xl leading-relaxed">
              Cricbuzz tells people what's happening. Reddit lets them discuss it. Fantasy platforms let them compete. 
              <strong> Beyond XI connects what fans think, what the data says, and what fans can do next.</strong>
            </p>

            {/* 3 Core Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider mb-1">
                  <Shield className="w-4 h-4" />
                  BELONG
                </div>
                <div className="text-white text-sm font-bold">Fan Identity</div>
                <p className="text-white/50 text-[11px] mt-1">Franchise loyalty, Dugout hubs, and rival tribe debate circles.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/30 transition-all">
                <div className="flex items-center gap-2 text-cyan-400 font-black text-xs uppercase tracking-wider mb-1">
                  <BarChart2 className="w-4 h-4" />
                  DISCOVER
                </div>
                <div className="text-white text-sm font-bold">Cricket Intelligence</div>
                <p className="text-white/50 text-[11px] mt-1">280,000+ ball telemetry, anomaly detectors, and decision engines.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/30 transition-all">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider mb-1">
                  <Trophy className="w-4 h-4" />
                  PLAY
                </div>
                <div className="text-white text-sm font-bold">Community Games</div>
                <p className="text-white/50 text-[11px] mt-1">Auction War Room, Playing XI simulator, and Cardverse stat battles.</p>
              </div>
            </div>
          </div>
        </div>

        {/* NATIVE AD VESSEL — Community Partner Briefing */}
        <div className="pt-2">
          <AdVessel slot="1029384761" format="horizontal" label="Beyond XI Partner Briefing · Community & Fan Economy" />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            2. THREE PARTICIPATORY IDENTITIES (SWITCHER)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">PARTICIPATION MATRIX</div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Participate Through Three Identities
              </h2>
              <p className="text-xs text-white/60">
                You are not limited to being a passive supporter. Switch seamlessly between Fan, Analyst, and Selector modes.
              </p>
            </div>

            {/* Identity Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
              {(["fan", "analyst", "selector"] as FanIdentity[]).map((id) => (
                <button
                  key={id}
                  onClick={() => setSelectedIdentity(id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    selectedIdentity === id
                      ? "bg-white/15 text-white shadow-md border border-white/10"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  {IDENTITIES[id].title}
                </button>
              ))}
            </div>
          </div>

          {/* Active Identity Interactive Card */}
          <GlassCard className={`p-6 sm:p-8 bg-gradient-to-r from-white/[0.02] to-black/40 border ${activeIdentityData.borderColor} shadow-xl`}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest ${activeIdentityData.accentBg} ${activeIdentityData.color} border ${activeIdentityData.borderColor}`}>
                    {activeIdentityData.badge}
                  </span>
                  <span className="text-xs font-bold text-white/50">{activeIdentityData.tagline}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  {activeIdentityData.title} Mode Active
                </h3>

                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                  {activeIdentityData.description}
                </p>

                {/* Key capabilities list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {activeIdentityData.capabilities.map((cap, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white/80">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${activeIdentityData.color} shrink-0`} />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Launch Container */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between h-full space-y-4">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  Recommended Command Hub
                </div>
                <div>
                  <div className="text-lg font-black text-white">
                    {selectedIdentity === "fan" ? "My Franchise Dugout" : selectedIdentity === "analyst" ? "AI Decision Engines" : "Auction War Room"}
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    {selectedIdentity === "fan" 
                      ? "Vote in polls, explore franchise timelines, and view rivalry standings."
                      : selectedIdentity === "analyst"
                      ? "Test hypotheses across 12 decision engines and 18 IPL seasons."
                      : "Command a ₹120 Cr purse and outbid 9 franchise algorithms."}
                  </div>
                </div>

                <Link href={selectedIdentity === "fan" ? "/dugout" : selectedIdentity === "analyst" ? "/ai-analyst" : "/auction"}>
                  <button className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                    selectedIdentity === "fan"
                      ? "bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/20"
                      : selectedIdentity === "analyst"
                      ? "bg-cyan-400 hover:bg-cyan-300 text-black shadow-cyan-400/20"
                      : "bg-emerald-400 hover:bg-emerald-300 text-black shadow-emerald-400/20"
                  }`}>
                    <span>{activeIdentityData.cta}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            3. THE INTERCONNECTED PRODUCT LOOP
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-black/60 via-[#060B18] to-black/60 border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">THE REAL DIFFERENTIATOR</div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                The Interconnected Beyond XI Loop
              </h2>
            </div>
            <span className="text-xs text-white/50 font-mono">
              Opinion → Evidence → Simulation → Competition
            </span>
          </div>

          {/* Stepped Loop Visualizer */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { step: "01", title: "Fan Identity", sub: "Choose your Dugout", href: "/dugout", icon: Shield, color: "text-amber-400" },
              { step: "02", title: "Fan Poll", sub: "Cast Parliament vote", href: "/dugout#parliament", icon: MessageSquare, color: "text-rose-400" },
              { step: "03", title: "Data Evidence", sub: "Inspect underlying stats", href: "/dugout#parliament", icon: BarChart2, color: "text-cyan-400" },
              { step: "04", title: "War Room", sub: "Test XI against cap", href: "/auction", icon: Gavel, color: "text-emerald-400" },
              { step: "05", title: "Challenge", sub: "Compete with friends", href: "/auction", icon: Users, color: "text-purple-400" },
              { step: "06", title: "Reputation", sub: "Earn verified score", href: "/dugout", icon: Award, color: "text-yellow-400" },
            ].map((st, i) => (
              <Link key={i} href={st.href} className="group">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/30 transition-all flex flex-col justify-between h-full space-y-2 group-hover:scale-105">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/40 font-bold">STEP {st.step}</span>
                    <st.icon className={`w-4 h-4 ${st.color}`} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white uppercase group-hover:text-primary transition-colors">
                      {st.title}
                    </div>
                    <div className="text-[10px] text-white/50 mt-0.5">
                      {st.sub}
                    </div>
                  </div>
                  <div className="pt-1 text-[9px] font-mono text-white/30 flex items-center gap-1 group-hover:text-white">
                    <span>Explore</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            4. THE TWELVE FEATURES DIRECTORY (FILTERABLE BENTO)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">PRODUCT ROADMAP & ENGINE MATRIX</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                Twelve Features That Make Beyond XI Different
              </h2>
              <p className="text-xs text-white/60">
                Explore where every feature lives across the platform, from live MVP engines to community labs.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
              {[
                { id: "all", label: "All 12 Features" },
                { id: "belong", label: "Belong (Identity)" },
                { id: "discover", label: "Discover (Intel)" },
                { id: "play", label: "Play (Games)" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterCategory(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterCategory === f.id
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 12 Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeatures.map((feat) => (
              <GlassCard
                key={feat.num}
                className="p-6 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 hover:border-white/30 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div className="space-y-3">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-white/40">
                      FEATURE {feat.num}
                    </span>
                    <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${
                      feat.status === "LIVE NOW"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    }`}>
                      {feat.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-black uppercase text-amber-400/90 tracking-wider">
                      {feat.badge}
                    </span>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                      {feat.title}
                    </h3>
                    <div className="text-xs font-semibold text-white/60 mt-0.5">
                      {feat.subtitle}
                    </div>
                  </div>

                  <p className="text-xs text-white/70 leading-relaxed">
                    {feat.description}
                  </p>

                  {/* Quantitative Stats Pills */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-black/40 border border-white/5 text-center">
                    {feat.stats.map((s, i) => (
                      <div key={i}>
                        <div className="text-[8px] font-mono text-white/40 uppercase">{s.label}</div>
                        <div className="text-[10px] font-black text-white mt-0.5 truncate">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {feat.tags.map((t, i) => (
                      <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/5">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="pt-4 mt-4 border-t border-white/10">
                  <Link href={feat.href}>
                    <button className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/15 text-white hover:text-primary text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10 hover:border-white/25">
                      <span>{feat.actionLabel}</span>
                    </button>
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            5. COMMUNITY INTELLIGENCE CONTRAST LAB
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0C1428] via-[#080E1C] to-[#050814] border border-cyan-500/30 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[9px] font-black uppercase tracking-wider">
                FEATURE 12 IN ACTION
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-1">
                Community Intelligence: Fan Sentiment vs Statistical Reality
              </h2>
            </div>
            <span className="text-xs text-white/40 font-mono">
              Calibrated on 18 IPL Seasons Data
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
            <div className="text-sm sm:text-base font-black text-white">
              "{COMMUNITY_SAMPLE.question}"
            </div>

            {/* Comparison Bars */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-amber-400">Public Fan Consensus (Optimism Bias)</span>
                  <span className="text-white font-mono">{COMMUNITY_SAMPLE.fanExpectation}% Believes Yes</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${COMMUNITY_SAMPLE.fanExpectation}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-cyan-400">Calibrated Historical Model Probability</span>
                  <span className="text-white font-mono">{COMMUNITY_SAMPLE.modelProbability}% Base Probability</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${COMMUNITY_SAMPLE.modelProbability}%` }} />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/80 space-y-1.5">
              <div className="font-bold text-cyan-300">Analytical Delta Verdict:</div>
              <p>{COMMUNITY_SAMPLE.deltaInsight}</p>
              <div className="text-[11px] text-white/50 pt-1 font-mono">
                Key Lever: {COMMUNITY_SAMPLE.keyFactor}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            6. SCOUT LAB (DOMESTIC GEMS SHOWCASE)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">FEATURE 09 IN ACTION</div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Scout Lab: Peer-Nominated Underrated Gems
              </h2>
            </div>
            <Link href="/stats" className="text-xs font-black text-emerald-400 hover:underline">
              View All 700+ Players →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SCOUT_GEMS.map((gem) => (
              <GlassCard key={gem.name} className="p-5 bg-black/40 border border-white/10 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {gem.franchise} SCOUTED
                    </span>
                    <button
                      onClick={() => handleUpvote(gem.name)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        hasUpvoted[gem.name]
                          ? "bg-emerald-500 text-black"
                          : "bg-white/5 text-white/70 hover:bg-white/15"
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{upvotes[gem.name]}</span>
                    </button>
                  </div>

                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    {gem.name}
                  </h3>
                  <div className="text-xs font-bold text-amber-400 font-mono">
                    {gem.stat}
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
                    "{gem.scoutNote}"
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 text-[10px] text-white/40 font-mono flex items-center justify-between">
                  <span>Role: {gem.role}</span>
                  <span className="text-emerald-400 font-bold">Verified Ball Evidence</span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            7. CRICKET STORY VAULT & STADIUM MEMORIES
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-black/80 via-[#100B1A] to-black/80 border border-purple-500/30 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-[9px] font-black uppercase tracking-wider">
                FEATURE 11 IN ACTION
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-1">
                Cricket Story Vault: Living Stadium Archive
              </h2>
            </div>
            <span className="text-xs text-white/40 font-mono">
              Preserving Fan Lore Across 18 IPL Seasons
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Chinnaswamy 2016 Final Heartbreak to 2026 Redemption",
                author: "Nikhil K. (RCB 12th Man)",
                date: "May 2016 / 2026",
                story: "I stood in the D-stand in 2016 watching the 208 chase fall 8 runs short. Ten years later, being there when Virat lifted the trophy felt like life coming full circle.",
                tag: "STADIUM LORE",
                milestoneKey: "RCB_2016"
              },
              {
                title: "The 1:35 AM Ahmedabad Rain Final & Jadeja's Magic",
                author: "Praveen R. (Chennai Brigade)",
                date: "May 2023",
                story: "No one left their seats despite 3 hours of thunderstorms. That final ball flick over fine leg was pure delirium under Narendra Modi Stadium lights.",
                tag: "CHAMPIONSHIP MEMORY",
                milestoneKey: "CSK_2023"
              },
              {
                title: "Wankhede 2017: Defending 129 Against Pune Warriors",
                author: "Siddharth M. (Paltan Core)",
                date: "May 2017",
                story: "Malinga and Johnson bowling back-of-a-length slower balls with 1 run to defend. My hands were trembling on the Garware pavilion railing.",
                tag: "FINAL BALL THRILLER",
                milestoneKey: "MI_2017"
              }
            ].map((st, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono font-black uppercase text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                      {st.tag}
                    </span>
                    {st.milestoneKey && (
                      <BroadcasterLink lookupParams={{ milestoneKey: st.milestoneKey }} variant="pill" label="Official Replay" />
                    )}
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight mt-2">
                    {st.title}
                  </h4>
                  <p className="text-xs text-white/70 mt-2 leading-relaxed">
                    "{st.story}"
                  </p>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/40">
                  <span>{st.author}</span>
                  <span>{st.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            8. CALL TO ACTION & DAILY HABIT LOOP
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-white/[0.04] to-black/60 border border-white/10 space-y-4">
          <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Start Your Beyond XI Journey Today
          </h3>
          <p className="text-xs sm:text-sm text-white/60 max-w-xl mx-auto">
            Choose your franchise, vote on real tactical questions, inspect the supporting evidence, and build your championship XI.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href={selectedTeam ? `/dugout/${selectedTeam}` : "/dugout"}>
              <button className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer">
                <Shield className="w-4 h-4 text-black" />
                <span>{selectedTeam ? `Enter My ${selectedTeam} Dugout` : "Pick Your Franchise Dugout"}</span>
              </button>
            </Link>

            <Link href="/auction">
              <button className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-black text-xs uppercase tracking-wider transition-all border border-white/15 flex items-center gap-2 cursor-pointer">
                <Gavel className="w-4 h-4 text-emerald-400" />
                <span>Launch Auction War Room</span>
              </button>
            </Link>

            <Link href="/ai-analyst">
              <button className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center gap-2 cursor-pointer">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                <span>Analyst Command Center</span>
              </button>
            </Link>
          </div>
        </div>

      </div>

      <VideoArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
      />
    </Layout>
  );
}
