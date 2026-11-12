/**
 * CricField Intelligence & Insights Hub
 * ─────────────────────────────────────────────────────────────────────────────
 * Institutional franchise intelligence, 100 deep-dive dossiers across 10 angles,
 * full editorial magazine archives, tactical breakdowns and telemetry analytics.
 * Fully synchronized with the active franchise parameter (?franchise=srh).
 */

import React, { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { TeamLogo } from "@/components/team-logo";
import { FRANCHISE_METADATA } from "@/data/editorial-magazine-data";
import { LibraryMedia, useFranchiseArticles } from "@/components/dugout/franchise-library";
import { EDITORIAL_ASPECTS, type EditorialAspectId } from "@/data/editorial/schema";
import { STORY_TYPE_LABEL } from "@/lib/editorial-v2";

// Intelligence angles → the editorial aspects used by the 100-article franchise library.
const ANGLE_TO_ASPECT: Record<string, EditorialAspectId> = {
  batting: "batting",
  bowling: "bowling-fielding",
  tactical: "tactical",
  auction: "auction-economics",
  business: "business",
  culture: "fan-culture",
  history: "history",
  development: "scouting",
  datascience: "data-science",
  future: "future",
};
const aspectName = (id: EditorialAspectId) => EDITORIAL_ASPECTS.find((a) => a.id === id)?.name ?? "";

function isLightHex(hex: string): boolean {
  const clean = (hex || "").replace("#", "");
  if (clean.length < 6) return false;
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150;
}
import {
  BookOpen, Search, ArrowRight, ChevronDown, ChevronRight,
  TrendingUp, Users, Target, Shield, Sparkles, Filter, Clock,
  Award, Flame, Compass, Activity, ShieldCheck, GraduationCap,
  Brain, Rocket, Cpu
} from "lucide-react";
import { useTeamTheme } from "@/lib/team-context";

// 11 Intelligence Angles with custom badge styling and icons
interface AngleCategory {
  id: string;
  label: string;
  badgeCount: number;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  bgActive: string;
}

const INTELLIGENCE_ANGLES: AngleCategory[] = [
  { id: "all", label: "All Articles", badgeCount: 100, icon: BookOpen, color: "text-cyan-400", borderColor: "border-cyan-500/30", bgActive: "bg-cyan-500/20" },
  { id: "batting", label: "Batting Intelligence", badgeCount: 10, icon: Flame, color: "text-rose-400", borderColor: "border-rose-500/30", bgActive: "bg-rose-500/20" },
  { id: "bowling", label: "Bowling & Fielding", badgeCount: 10, icon: Target, color: "text-blue-400", borderColor: "border-blue-500/30", bgActive: "bg-blue-500/20" },
  { id: "tactical", label: "Tactical & Match", badgeCount: 10, icon: Compass, color: "text-purple-400", borderColor: "border-purple-500/30", bgActive: "bg-purple-500/20" },
  { id: "auction", label: "Auction & Economics", badgeCount: 10, icon: Award, color: "text-pink-400", borderColor: "border-pink-500/30", bgActive: "bg-pink-500/20" },
  { id: "business", label: "Business & Revenue", badgeCount: 10, icon: TrendingUp, color: "text-emerald-400", borderColor: "border-emerald-500/30", bgActive: "bg-emerald-500/20" },
  { id: "culture", label: "Fan Culture", badgeCount: 10, icon: Users, color: "text-amber-400", borderColor: "border-amber-500/30", bgActive: "bg-amber-500/20" },
  { id: "history", label: "History & Legacy", badgeCount: 10, icon: ShieldCheck, color: "text-teal-400", borderColor: "border-teal-500/30", bgActive: "bg-teal-500/20" },
  { id: "development", label: "Player Development", badgeCount: 10, icon: GraduationCap, color: "text-cyan-400", borderColor: "border-cyan-500/30", bgActive: "bg-cyan-500/20" },
  { id: "datascience", label: "Data Science", badgeCount: 10, icon: Brain, color: "text-indigo-400", borderColor: "border-indigo-500/30", bgActive: "bg-indigo-500/20" },
  { id: "future", label: "Future Strategy", badgeCount: 10, icon: Rocket, color: "text-lime-400", borderColor: "border-lime-500/30", bgActive: "bg-lime-500/20" },
];

interface FranchiseIntelligenceData {
  code: string;
  name: string;
  motto: string;
  heroImage: string;
  stadiumImage: string;
  featuredPlayer: string;
  accent: string;
  venue: string;
  players: string[];
  popularTags: string[];
  trendingTopics: Array<{ rank: number; title: string; cat: string; views: string }>;
}

export const FRANCHISE_INTELLIGENCE: Record<string, FranchiseIntelligenceData> = {
  SRH: {
    code: "SRH",
    name: "Sunrisers Hyderabad",
    motto: "Orange Army",
    heroImage: "/abhisek sharma.jpg",
    stadiumImage: "/rajiv gandhi hyderabad stadium.webp",
    featuredPlayer: "Pat Cummins & Abhishek Sharma",
    accent: "#F26522",
    venue: "Rajiv Gandhi International Stadium, Uppal",
    players: ["Pat Cummins", "Travis Head", "Heinrich Klaasen", "Abhishek Sharma", "Bhuvneshwar Kumar", "Nitish Kumar Reddy", "T Natarajan"],
    popularTags: ["Pat Cummins", "Travis Head", "Heinrich Klaasen", "Uppal", "Powerplay 125", "Death Overs", "Abhishek Sharma", "Orange Army"],
    trendingTopics: [
      { rank: 1, title: "SRH's 125-Run Powerplay Blueprint", cat: "Batting Intelligence", views: "14.2K" },
      { rank: 2, title: "Uppal: Turning Hyderabad into a 250+ Fortress", cat: "Tactical & Match", views: "11.8K" },
      { rank: 3, title: "Head & Abhishek: The Geometry of Destruction", cat: "Batting Intelligence", views: "10.4K" },
      { rank: 4, title: "Pat Cummins' Bowling Changes Under Pressure", cat: "Tactical & Match", views: "8.9K" },
      { rank: 5, title: "Klaasen's Spin Punishment Thresholds", cat: "Data Science", views: "7.6K" },
    ],
  },
  RCB: {
    code: "RCB",
    name: "Royal Challengers Bengaluru",
    motto: "Play Bold",
    heroImage: "/virat kohli.jpg",
    stadiumImage: "/chinnaswamy stadium.webp",
    featuredPlayer: "Virat Kohli",
    accent: "#E01E37",
    venue: "M. Chinnaswamy Stadium, Bengaluru",
    players: ["Virat Kohli", "Faf du Plessis", "Rajat Patidar", "Glenn Maxwell", "Mohammed Siraj", "Dinesh Karthik", "Cameron Green"],
    popularTags: ["Virat Kohli", "Faf du Plessis", "Chinnaswamy", "Middle Order", "Death Overs", "Rajat Patidar", "Playoffs", "Superstar Culture"],
    trendingTopics: [
      { rank: 1, title: "RCB's Middle-Order Evolution", cat: "Batting Intelligence", views: "12.4K" },
      { rank: 2, title: "Chinnaswamy: Fortress or False Advantage?", cat: "Tactical & Match", views: "9.8K" },
      { rank: 3, title: "Why RCB Still Chases 200", cat: "Data Science", views: "8.1K" },
      { rank: 4, title: "The Auction Strategy Dilemma", cat: "Auction & Economics", views: "7.5K" },
      { rank: 5, title: "RCB's Global Fan Phenomenon", cat: "Fan Culture", views: "6.3K" },
    ],
  },
  CSK: {
    code: "CSK",
    name: "Chennai Super Kings",
    motto: "Whistle Podu",
    heroImage: "/msd.jpg",
    stadiumImage: "/ma chidambaram stadium.webp",
    featuredPlayer: "MS Dhoni & Ruturaj Gaikwad",
    accent: "#F9CD05",
    venue: "M.A. Chidambaram Stadium, Chepauk, Chennai",
    players: ["MS Dhoni", "Ruturaj Gaikwad", "Ravindra Jadeja", "Shivam Dube", "Matheesha Pathirana", "Suresh Raina"],
    popularTags: ["MS Dhoni", "Chepauk", "Spin Choke", "Ruturaj Gaikwad", "Yellow Army", "Whistle Podu", "Calculated Chase", "Finishing Mastery"],
    trendingTopics: [
      { rank: 1, title: "The Chepauk Spin Choke: Mathematical Analysis", cat: "Bowling & Fielding", views: "13.6K" },
      { rank: 2, title: "Dhoni's Endgame: Run-Chase Calculations", cat: "Tactical & Match", views: "12.1K" },
      { rank: 3, title: "Ruturaj's Captaincy Transition & Stability", cat: "Player Development", views: "9.4K" },
      { rank: 4, title: "CSK's Retention Economics: Loyalty vs Peak Value", cat: "Auction & Economics", views: "8.7K" },
      { rank: 5, title: "Whistle Podu: Tribal Loyalty in Modern Sport", cat: "Fan Culture", views: "7.9K" },
    ],
  },
  MI: {
    code: "MI",
    name: "Mumbai Indians",
    motto: "One Family",
    heroImage: "/rohit sharma.jpg",
    stadiumImage: "/wankhede stadium.webp",
    featuredPlayer: "Rohit Sharma & Jasprit Bumrah",
    accent: "#004BA0",
    venue: "Wankhede Stadium, Mumbai",
    players: ["Rohit Sharma", "Jasprit Bumrah", "Suryakumar Yadav", "Hardik Pandya", "Tilak Varma", "Lasith Malinga"],
    popularTags: ["Rohit Sharma", "Wankhede", "Bumrah Yorker", "Scouting Engine", "Championship Pedigree", "Suryakumar Yadav", "Pace Battery", "One Family"],
    trendingTopics: [
      { rank: 1, title: "Jasprit Bumrah's Phase-Wise Economy Suppression", cat: "Bowling & Fielding", views: "15.1K" },
      { rank: 2, title: "Wankhede Red-Soil Dynamics: Batting Par Scores", cat: "Tactical & Match", views: "11.2K" },
      { rank: 3, title: "Rohit Sharma's Powerplay Aggression Shift", cat: "Batting Intelligence", views: "10.8K" },
      { rank: 4, title: "The MI Scouting Machine: Finding Gems", cat: "Player Development", views: "9.1K" },
      { rank: 5, title: "Auction Room Mastery: Building 5-Title Cores", cat: "Auction & Economics", views: "8.3K" },
    ],
  },
  KKR: {
    code: "KKR",
    name: "Kolkata Knight Riders",
    motto: "Korbo Lorbo Jeetbo",
    heroImage: "/s narine.jpg",
    stadiumImage: "/eden gardens stadium.webp",
    featuredPlayer: "Sunil Narine & Andre Russell",
    accent: "#3A225D",
    venue: "Eden Gardens, Kolkata",
    players: ["Sunil Narine", "Andre Russell", "Shreyas Iyer", "Rinku Singh", "Varun Chakravarthy", "Mitchell Starc"],
    popularTags: ["Sunil Narine", "Eden Gardens", "Spin Web", "Andre Russell", "Fearless Batting", "Shreyas Iyer", "Boundary Rate", "Purple Haze"],
    trendingTopics: [
      { rank: 1, title: "Sunil Narine: The Opener Renaissance Model", cat: "Batting Intelligence", views: "13.9K" },
      { rank: 2, title: "Eden Gardens Spin Web: Pitch Degradation Matrix", cat: "Tactical & Match", views: "10.5K" },
      { rank: 3, title: "Russell's Muscle: Bat Velocity vs High Pace", cat: "Data Science", views: "9.2K" },
      { rank: 4, title: "Aggressive Intent Over Anchor Archetypes", cat: "Tactical & Match", views: "8.4K" },
      { rank: 5, title: "KKR Fanbase: Passion & Kolkata Cricket Soul", cat: "Fan Culture", views: "7.1K" },
    ],
  },
  RR: {
    code: "RR",
    name: "Rajasthan Royals",
    motto: "Halla Bol",
    heroImage: "/players/rr-2026/yashasvi-jaiswal.webp",
    stadiumImage: "/venue-images/sawai mansingh jaipur stadium.webp",
    featuredPlayer: "Yashasvi Jaiswal & Riyan Parag",
    accent: "#EA1A85",
    venue: "Sawai Mansingh Stadium, Jaipur",
    players: ["Yashasvi Jaiswal", "Riyan Parag", "Shimron Hetmyer", "Sandeep Sharma", "Donovan Ferreira", "Trent Boult"],
    popularTags: ["Yashasvi Jaiswal", "SMS Jaipur", "Moneyball", "Riyan Parag", "Tactical Innovation", "Death Overs", "Powerplay Fire", "Halla Bol"],
    trendingTopics: [
      { rank: 1, title: "Yashasvi Jaiswal's Front-Foot Dominance", cat: "Batting Intelligence", views: "11.7K" },
      { rank: 2, title: "SMS Jaipur: Long Boundaries and Spin Suffocation", cat: "Tactical & Match", views: "9.6K" },
      { rank: 3, title: "Riyan Parag's Middle-Overs Anchor & Finishing", cat: "Tactical & Match", views: "8.8K" },
      { rank: 4, title: "The Rajasthan Scouting Pipeline: Uncapped Gems", cat: "Player Development", views: "7.9K" },
      { rank: 5, title: "Boult & Sandeep: Powerplay & Death Symmetry", cat: "Bowling & Fielding", views: "7.4K" },
    ],
  },
  DC: {
    code: "DC",
    name: "Delhi Capitals",
    motto: "Roar Macha",
    heroImage: "/arun jaitely stadium.webp",
    stadiumImage: "/arun jaitely stadium.webp",
    featuredPlayer: "Rishabh Pant & Axar Patel",
    accent: "#0078BC",
    venue: "Arun Jaitley Stadium, Kotla, Delhi",
    players: ["Rishabh Pant", "Axar Patel", "Kuldeep Yadav", "Tristan Stubbs", "Jake Fraser-McGurk", "David Warner"],
    popularTags: ["Rishabh Pant", "Kotla", "Young Core", "Axar Patel", "Squad Construction", "Powerplay Hitting", "Kuldeep Magic", "Roar Macha"],
    trendingTopics: [
      { rank: 1, title: "Rishabh Pant's Comeback & Batting Impact", cat: "Batting Intelligence", views: "12.8K" },
      { rank: 2, title: "Kotla's Shorter Fences & Run Spikes", cat: "Tactical & Match", views: "9.3K" },
      { rank: 3, title: "Axar Patel's Elite T20 Value: Underrated All-Rounder", cat: "Data Science", views: "8.5K" },
      { rank: 4, title: "DC's Overseas Core: Strategy & Stability", cat: "Auction & Economics", views: "7.2K" },
      { rank: 5, title: "Youth Reconstruction in Capital City", cat: "Player Development", views: "6.8K" },
    ],
  },
  PBKS: {
    code: "PBKS",
    name: "Punjab Kings",
    motto: "Sadda Punjab",
    heroImage: "/shikhar dhawan.jpg",
    stadiumImage: "/is bindra stadium.jpg",
    featuredPlayer: "Shikhar Dhawan & Arshdeep Singh",
    accent: "#DD1F2D",
    venue: "PCA New Stadium, Mullanpur / Dharamshala",
    players: ["Shikhar Dhawan", "Shashank Singh", "Ashutosh Sharma", "Arshdeep Singh", "Sam Curran", "Liam Livingstone"],
    popularTags: ["Shikhar Dhawan", "Mullanpur", "High-Risk Batting", "Arshdeep Singh", "Shashank Singh", "Chaos Theory", "Death Bowling", "Sadda Punjab"],
    trendingTopics: [
      { rank: 1, title: "Shashank & Ashutosh: The Death Overs Miracle", cat: "Batting Intelligence", views: "12.2K" },
      { rank: 2, title: "Mullanpur Pitch Dynamics: Pace, Bounce & Drift", cat: "Tactical & Match", views: "8.9K" },
      { rank: 3, title: "Arshdeep Singh's Death Yorkers Precision Matrix", cat: "Bowling & Fielding", views: "8.3K" },
      { rank: 4, title: "Punjab's Chasing Psychology: Closing Tight Games", cat: "Fan Culture", views: "7.5K" },
      { rank: 5, title: "Rebuilding PBKS: The Search for Season Stability", cat: "Future Strategy", views: "6.9K" },
    ],
  },
  GT: {
    code: "GT",
    name: "Gujarat Titans",
    motto: "Aava De",
    heroImage: "/rashid khan.jpg",
    stadiumImage: "/narendra modi stadium.webp",
    featuredPlayer: "Shubman Gill & Rashid Khan",
    accent: "#1B2133",
    venue: "Narendra Modi Stadium, Ahmedabad",
    players: ["Shubman Gill", "Rashid Khan", "David Miller", "Sai Sudharsan", "Mohammed Shami", "Rahul Tewatia"],
    popularTags: ["Shubman Gill", "Narendra Modi Stadium", "Efficiency", "Rashid Khan", "Match Control", "Sai Sudharsan", "Bowling Depth", "Aava De"],
    trendingTopics: [
      { rank: 1, title: "Shubman Gill's Controlled Aggression Metric", cat: "Batting Intelligence", views: "13.1K" },
      { rank: 2, title: "Narendra Modi Stadium: Dew and Dimension Dynamics", cat: "Tactical & Match", views: "10.1K" },
      { rank: 3, title: "Rashid Khan's Bowling Impact in Tight Spells", cat: "Bowling & Fielding", views: "9.7K" },
      { rank: 4, title: "GT's Match-Winning Efficiency: The Calm Under Pressure", cat: "Data Science", views: "8.2K" },
      { rank: 5, title: "Building a Modern Franchise Identity in 3 Years", cat: "Business & Revenue", views: "7.3K" },
    ],
  },
  LSG: {
    code: "LSG",
    name: "Lucknow Super Giants",
    motto: "Gazab Andaz",
    heroImage: "/kl rahul.jpg",
    stadiumImage: "/lucknow stadium.webp",
    featuredPlayer: "KL Rahul & Nicholas Pooran",
    accent: "#22D3EE",
    venue: "BRSABV Ekana Cricket Stadium, Lucknow",
    players: ["KL Rahul", "Nicholas Pooran", "Marcus Stoinis", "Mayank Yadav", "Ravi Bishnoi", "Ayush Badoni"],
    popularTags: ["KL Rahul", "Ekana", "Anchor Strategy", "Nicholas Pooran", "Mayank Yadav Pace", "Matchups", "Target Defending", "Gazab Andaz"],
    trendingTopics: [
      { rank: 1, title: "Mayank Yadav: The 156.7 KPH Phenomenon", cat: "Bowling & Fielding", views: "14.5K" },
      { rank: 2, title: "Ekana's Twin Soils: Red vs Black Pitch Behaviour", cat: "Tactical & Match", views: "10.6K" },
      { rank: 3, title: "Nicholas Pooran: The Pure Striking Velocity Index", cat: "Batting Intelligence", views: "9.9K" },
      { rank: 4, title: "Defending 160+: Lucknow's Tactical Template", cat: "Tactical & Match", views: "8.7K" },
      { rank: 5, title: "KL Rahul's Accumulation vs Strike Rate Tradeoff", cat: "Data Science", views: "8.0K" },
    ],
  },
};

const ALL_FRANCHISES = [
  { code: "SRH", name: "Sunrisers Hyderabad" },
  { code: "RCB", name: "Royal Challengers Bengaluru" },
  { code: "CSK", name: "Chennai Super Kings" },
  { code: "MI", name: "Mumbai Indians" },
  { code: "KKR", name: "Kolkata Knight Riders" },
  { code: "RR", name: "Rajasthan Royals" },
  { code: "DC", name: "Delhi Capitals" },
  { code: "PBKS", name: "Punjab Kings" },
  { code: "GT", name: "Gujarat Titans" },
  { code: "LSG", name: "Lucknow Super Giants" },
];

const SEASONS = ["2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017"];

export default function IntelligencePage() {
  const { selectedTeam } = useTeamTheme();

  // Active search query params
  const [searchParamStr, setSearchParamStr] = useState(() => (typeof window !== "undefined" ? window.location.search : ""));

  useEffect(() => {
    const onPop = () => setSearchParamStr(window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const searchParams = useMemo(() => new URLSearchParams(searchParamStr), [searchParamStr]);
  const activeFranchiseCode = useMemo(() => {
    const raw = searchParams.get("franchise");
    if (raw) return raw.toUpperCase();
    return (selectedTeam || "SRH").toUpperCase();
  }, [searchParams, selectedTeam]);

  // Franchise Intelligence Configuration
  const franchiseConfig = useMemo(() => {
    return (
      FRANCHISE_INTELLIGENCE[activeFranchiseCode] ||
      FRANCHISE_INTELLIGENCE["SRH"]
    );
  }, [activeFranchiseCode]);

  // Franchise Metadata from the Magazine Registry
  const franchiseMeta = useMemo(() => {
    return (
      FRANCHISE_METADATA[activeFranchiseCode] || {
        name: franchiseConfig.name,
        identity: franchiseConfig.motto,
        accent: franchiseConfig.accent,
        venue: franchiseConfig.venue,
      }
    );
  }, [activeFranchiseCode, franchiseConfig]);

  // Local Filter States — Automatically derived and reset when activeFranchiseCode changes
  const [selectedAngle, setSelectedAngle] = useState<string>(() => searchParams.get("angle") || "all");
  const [selectedSeason, setSelectedSeason] = useState<string>("All Seasons");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("All Players");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [franchisePickerOpen, setFranchisePickerOpen] = useState(false);

  // Cleanly reset local filters whenever active franchise changes
  useEffect(() => {
    setSelectedAngle(searchParams.get("angle") || "all");
    setSelectedSeason("All Seasons");
    setSelectedPlayer("All Players");
    setSearchQuery("");
    setCurrentPage(1);
  }, [activeFranchiseCode]);

  // Switch franchise handler that updates URL query
  const handleSelectFranchise = (code: string) => {
    setFranchisePickerOpen(false);
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("franchise", code.toLowerCase());
    window.history.pushState(null, "", `${window.location.pathname}?${nextParams.toString()}`);
    setSearchParamStr(window.location.search);
  };

  // Every readable article for this franchise — the same list as the Dugout library (new + legacy).
  const { items: libraryItems, featured: featuredEntry } = useFranchiseArticles(activeFranchiseCode);
  const franchiseArticles = useMemo(() => libraryItems.filter((i) => i.kind !== "planned"), [libraryItems]);

  // Featured article: the franchise's featured investigation, else the first article
  const featuredArticle = useMemo(
    () => franchiseArticles.find((i) => i.key === featuredEntry?.id) ?? franchiseArticles[0],
    [franchiseArticles, featuredEntry],
  );

  // Real per-angle counts for the angle cards
  const angleCounts = useMemo(() => {
    const c: Record<string, number> = { all: franchiseArticles.length };
    for (const [angle, aspect] of Object.entries(ANGLE_TO_ASPECT)) c[angle] = franchiseArticles.filter((i) => i.aspect === aspect).length;
    return c;
  }, [franchiseArticles]);

  // Filtered Articles based on angle, search, and dropdowns
  const filteredArticles = useMemo(() => {
    return franchiseArticles.filter((art) => {
      if (selectedAngle !== "all" && art.aspect !== ANGLE_TO_ASPECT[selectedAngle]) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!art.title.toLowerCase().includes(q) && !art.dek.toLowerCase().includes(q) && !aspectName(art.aspect).toLowerCase().includes(q)) return false;
      }

      if (selectedPlayer !== "All Players") {
        const q = selectedPlayer.toLowerCase();
        if (!art.title.toLowerCase().includes(q) && !art.dek.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [franchiseArticles, selectedAngle, searchQuery, selectedPlayer]);

  // Pagination (9 articles per page)
  const pageSize = 9;
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));
  const displayedArticles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredArticles.slice(start, start + pageSize);
  }, [filteredArticles, currentPage]);

  return (
    <Layout>
      <main key={activeFranchiseCode} className="min-h-screen bg-slate-50 dark:bg-[#070C16] text-slate-900 dark:text-[#F3F4F6] pb-24 font-sans selection:bg-lime-400 selection:text-black">
        {/* ── BREADCRUMBS & FRANCHISE SWITCHER ROW ── */}
        <div className="border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#070C16]/95 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Breadcrumb path */}
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              <Link href="/dugout">
                <span className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Editorial Dugout</span>
                </span>
              </Link>
              <span>›</span>
              <span className="text-slate-800 dark:text-white font-bold">{franchiseMeta.name}</span>
              <span>›</span>
              <span className="text-cyan-600 dark:text-cyan-300 font-black">Intelligence Hub</span>
            </div>


          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
          {/* ═════════════════════════════════════════════════════════════════
              1. FRANCHISE INTELLIGENCE HUB HERO
             ═════════════════════════════════════════════════════════════════ */}
          <section className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-gradient-to-r dark:from-[#0C1222] dark:via-[#0D162C] dark:to-[#1A0F22] p-6 sm:p-8 lg:p-10 shadow-sm dark:shadow-2xl">
            {/* Ambient Background Light Flares */}
            <div
              className="absolute top-0 right-1/4 w-[450px] h-[450px] rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: franchiseMeta.accent || franchiseConfig.accent }}
            />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Content (8 cols) */}
              <div className="lg:col-span-8 space-y-5">
                <div className="flex items-center gap-4">
                  <TeamLogo team={activeFranchiseCode} size="w-16 h-16 sm:w-20 sm:h-20" />
                  <div>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest border"
                      style={{
                        backgroundColor: `${franchiseConfig.accent}20`,
                        color: franchiseConfig.accent,
                        borderColor: `${franchiseConfig.accent}40`,
                      }}
                    >
                      FRANCHISE INTELLIGENCE HUB
                    </span>
                    <div className="font-serif italic text-sm text-amber-500 dark:text-amber-300 mt-1">
                      "{franchiseConfig.motto}"
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight text-slate-900 dark:text-white uppercase leading-tight">
                    {franchiseMeta.name}
                  </h1>
                  <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300">
                    100 Deep-Dive Articles. 10 Angles. One Complete Franchise Story.
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                    Explore {activeFranchiseCode}'s batting firepower, tactical evolution, auction strategy, fan culture, historical moments, data-driven analysis and future roadmap — all in one place.
                  </p>
                </div>

                {/* Stat Counters Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 text-left font-mono">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">100</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Intelligence Articles</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 text-left font-mono">
                    <div className="text-2xl font-black text-amber-500 dark:text-amber-400">10</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Editorial Angles</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 text-left font-mono">
                    <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">15</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Seasons Covered</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 text-left font-mono">
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">50+</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Players Analysed</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 text-left font-mono col-span-2 sm:col-span-1">
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">∞</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Stories to Explore</div>
                  </div>
                </div>
              </div>

              {/* Right Hero Cinematic Visual (4 cols) */}
              <div className="lg:col-span-4 relative flex justify-center lg:justify-end">
                <div className="relative w-full max-w-xs aspect-square rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-md dark:shadow-2xl bg-slate-100 dark:bg-gradient-to-tr dark:from-black dark:via-slate-900/40 dark:to-transparent flex items-center justify-center p-3">
                  <img
                    src={franchiseConfig.heroImage}
                    alt={franchiseMeta.name}
                    className="w-full h-full object-cover rounded-2xl opacity-90 shadow-2xl filter contrast-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = franchiseConfig.stadiumImage || "/hero-players.png";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 dark:from-[#0C1222] via-transparent to-transparent opacity-75" />
                  <div className="absolute bottom-4 left-4 right-4 text-left">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                      {activeFranchiseCode} LEGACY
                    </span>
                    <div className="text-xs font-black text-white uppercase tracking-tight truncate">
                      {franchiseConfig.featuredPlayer}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ═════════════════════════════════════════════════════════════════
              2. EXPLORE BY INTELLIGENCE ANGLE (11 ANGLE CARDS)
             ═════════════════════════════════════════════════════════════════ */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: franchiseMeta.accent }}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>EXPLORE BY INTELLIGENCE ANGLE</span>
              </span>
              <span className="text-xs font-mono text-slate-500">11 Strategic Pillars</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2.5">
              {INTELLIGENCE_ANGLES.map((angle) => {
                const IconComponent = angle.icon;
                const isActive = selectedAngle === angle.id;

                return (
                  <button
                    key={angle.id}
                    onClick={() => {
                      setSelectedAngle(angle.id);
                      setCurrentPage(1);
                    }}
                    className={`group relative p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-[100px] overflow-hidden ${
                      isActive
                        ? `${angle.borderColor} ${angle.bgActive} shadow-lg ring-1 ring-cyan-400/40`
                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220]/70 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/20 shadow-sm dark:shadow-none"
                    }`}
                  >
                    {/* Top Row: Icon + Badge Count */}
                    <div className="flex items-center justify-between w-full">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 ${angle.color}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-white/10 ${isActive ? "text-white font-black" : "text-slate-600 dark:text-slate-400"}`}>
                        {angleCounts[angle.id] ?? 0}
                      </span>
                    </div>

                    {/* Bottom Label */}
                    <div className="text-[11px] font-bold leading-tight text-slate-800 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                      {angle.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ═════════════════════════════════════════════════════════════════
              3. MAIN CONTENT: ARTICLES LIST (70%) + SIDEBAR (30%)
             ═════════════════════════════════════════════════════════════════ */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
            {/* ── LEFT COLUMN: 8 COLS ── */}
            <div className="lg:col-span-8 space-y-6">
              {/* Section Title & Subhead */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <span>ALL {activeFranchiseCode} INTELLIGENCE ARTICLES</span>
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    A complete library of analytical, tactical and storytelling articles on {franchiseMeta.name}.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-slate-500 shrink-0">
                  Showing {filteredArticles.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
                  {Math.min(currentPage * pageSize, filteredArticles.length)} of {filteredArticles.length}
                </div>
              </div>

              {/* Filter Dropdown Ribbon */}
              <div className="p-3 rounded-2xl bg-white dark:bg-[#0B1220]/80 border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-sm dark:shadow-none">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {/* Dropdown: Angle */}
                  <select
                    value={selectedAngle}
                    onChange={(e) => {
                      setSelectedAngle(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="all">All Angles</option>
                    <option value="batting">Batting Intelligence</option>
                    <option value="bowling">Bowling &amp; Fielding</option>
                    <option value="tactical">Tactical &amp; Match</option>
                    <option value="auction">Auction &amp; Economics</option>
                    <option value="business">Business &amp; Revenue</option>
                    <option value="culture">Fan Culture</option>
                    <option value="history">History &amp; Legacy</option>
                    <option value="development">Player Development</option>
                    <option value="datascience">Data Science</option>
                    <option value="future">Future Strategy</option>
                  </select>

                  {/* Dropdown: Seasons */}
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="All Seasons">All Seasons</option>
                    {SEASONS.map((s) => (
                      <option key={s} value={s}>{s} Season</option>
                    ))}
                  </select>

                  {/* Dropdown: Players (Dynamically loaded per franchise) */}
                  <select
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="All Players">All Players ({activeFranchiseCode})</option>
                    {franchiseConfig.players.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Search Box */}
                <div className="relative min-w-[200px] shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search articles..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 hover:border-cyan-500/30 focus:border-cyan-400 focus:outline-none text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                  />
                </div>
              </div>

              {/* ── FEATURED ARTICLE HERO CARD ── */}
              {featuredArticle && (
                <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-gradient-to-r dark:from-[#0C1426] dark:via-[#101C34] dark:to-[#1C1226] p-6 sm:p-7 shadow-lg dark:shadow-2xl group hover:border-slate-300 dark:hover:border-white/20 transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Left text */}
                    <div className="md:col-span-7 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Compass className="w-3 h-3" />
                          <span>{aspectName(featuredArticle.aspect)}</span>
                        </span>
                        {featuredArticle.meta && (
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{featuredArticle.meta}</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight group-hover:text-primary dark:group-hover:text-amber-300 transition-colors">
                        {featuredArticle.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                        {featuredArticle.dek}
                      </p>

                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <Link href={featuredArticle.href ?? "#"}>
                          <button
                            type="button"
                            className="px-4 py-2 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md hover:brightness-110 active:scale-[0.98] cursor-pointer"
                            style={{
                              backgroundColor: franchiseMeta.accent,
                              color: isLightHex(franchiseMeta.accent) ? "#0A101D" : "#FFFFFF",
                              boxShadow: `0 4px 16px -2px ${franchiseMeta.accent}40`,
                            }}
                          >
                            <span>Read Article</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>

                        <Link href={`/dugout/${activeFranchiseCode.toLowerCase()}`}>
                          <button
                            type="button"
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white font-mono text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                            <span>Deep Dive Analysis</span>
                          </button>
                        </Link>
                      </div>
                    </div>

                    {/* Right hero image */}
                    <div className="md:col-span-5 relative">
                      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative shadow-xl">
                        <LibraryMedia
                          imageId={featuredArticle.imageId}
                          title={featuredArticle.title}
                          accent={franchiseMeta.accent ?? franchiseConfig.accent}
                          code={activeFranchiseCode}
                          teamName={franchiseMeta.name}
                          aspect={featuredArticle.aspect}
                          isCoverStory={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 3-COLUMN ARTICLES GRID ── */}
              {displayedArticles.length === 0 ? (
                <div className="p-12 rounded-3xl border border-dashed border-white/10 text-center space-y-2">
                  <div className="text-sm font-mono text-slate-400">No articles match your selected filter criteria.</div>
                  <button
                    onClick={() => {
                      setSelectedAngle("all");
                      setSearchQuery("");
                      setSelectedPlayer("All Players");
                    }}
                    className="text-xs font-mono text-cyan-400 underline cursor-pointer"
                  >
                    Reset all filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {displayedArticles.map((art) => (
                    <Link
                      key={art.key}
                      href={art.href ?? "#"}
                      onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white hover:bg-slate-50 dark:bg-[#0B1220]/70 dark:hover:bg-[#0E1728] hover:border-slate-300 dark:hover:border-white/25 overflow-hidden transition-all duration-300 shadow-md dark:shadow-lg cursor-pointer"
                    >
                      {/* 16:9 cover: the article's header photo, or the CricField illustration */}
                      <LibraryMedia
                        imageId={art.imageId}
                        title={art.title}
                        accent={franchiseMeta.accent ?? franchiseConfig.accent}
                        code={activeFranchiseCode}
                        teamName={franchiseMeta.name}
                        aspect={art.aspect}
                      />

                      {/* Body Details */}
                      <div className="p-4 space-y-2.5 flex-1 flex flex-col">
                        {/* Aspect + read time */}
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                          <span
                            className="px-2 py-0.5 rounded-md font-bold uppercase tracking-wider truncate max-w-[190px]"
                            style={{
                              backgroundColor: `${franchiseMeta.accent}15`,
                              color: franchiseMeta.accent,
                              border: `1px solid ${franchiseMeta.accent}30`,
                            }}
                          >
                            {aspectName(art.aspect)}
                          </span>
                          {art.meta && (
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 font-medium text-[11px]">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {art.meta}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                          {art.title}
                        </h4>

                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {art.dek}
                        </p>

                        {/* Footer */}
                        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>{art.number ? `No. ${art.number}` : ""}</span>
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            {art.kind === "legacy" ? "From the archive" : (STORY_TYPE_LABEL[art.storyType ?? ""] ?? "New")}
                            <ArrowRight className="w-3 h-3 text-cyan-600 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* ── PAGINATION BAR ── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-4">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 disabled:opacity-30 text-xs font-mono text-white cursor-pointer"
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={`w-8 h-8 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        currentPage === num
                          ? "font-black shadow-md"
                          : "border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                      style={
                        currentPage === num
                          ? {
                              backgroundColor: franchiseMeta.accent,
                              color: isLightHex(franchiseMeta.accent) ? "#0A101D" : "#FFFFFF",
                              boxShadow: `0 4px 12px -2px ${franchiseMeta.accent}40`,
                            }
                          : undefined
                      }
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 disabled:opacity-30 text-xs font-mono text-white cursor-pointer"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN: 4 COLS (INTELLIGENCE SIDEBAR) ── */}
            <div className="lg:col-span-4 space-y-6">
              {/* CARD 1: TRENDING TOPICS (DYNAMIC PER FRANCHISE) */}
              <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220]/80 p-5 space-y-4 shadow-sm dark:shadow-xl">
                <div className="flex items-center gap-2 text-xs font-mono font-black uppercase tracking-widest" style={{ color: franchiseMeta.accent }}>
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>TRENDING TOPICS</span>
                </div>

                <div className="space-y-3">
                  {franchiseConfig.trendingTopics.map((item) => (
                    <div
                      key={item.rank}
                      onClick={() => {
                        setSearchQuery(item.title);
                        setCurrentPage(1);
                      }}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] dark:border-white/5 transition-all flex items-start gap-3 cursor-pointer group"
                    >
                      <span className="w-6 h-6 rounded-lg bg-black/50 border border-white/10 text-cyan-400 font-mono font-black text-xs flex items-center justify-center shrink-0">
                        {item.rank}
                      </span>
                      <div className="space-y-0.5 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-cyan-300 transition-colors leading-snug">
                          {item.title}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>{item.cat}</span>
                          <span className="text-orange-400 flex items-center gap-0.5 font-bold">
                            <Flame className="w-2.5 h-2.5" />
                            {item.views}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD 2: QUICK FILTERS (DYNAMIC PER FRANCHISE) */}
              <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220]/80 p-5 space-y-4 shadow-sm dark:shadow-xl">
                <div className="flex items-center gap-2 text-xs font-mono font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                  <Filter className="w-4 h-4" />
                  <span>QUICK FILTERS</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-2">
                      Popular Filters ({activeFranchiseCode})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {franchiseConfig.popularTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setSearchQuery(tag);
                            setCurrentPage(1);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.03] dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-white/80 dark:hover:text-white text-[11px] font-mono transition-all cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-2">
                      Seasons
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {SEASONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setSelectedSeason(s);
                            setCurrentPage(1);
                          }}
                          className={`py-1 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer ${
                            selectedSeason === s
                              ? "bg-cyan-500 text-black font-black"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.03] dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: RELATED INTELLIGENCE TOOLS */}
              <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1220]/80 p-5 space-y-3 shadow-sm dark:shadow-xl">
                <div className="flex items-center gap-2 text-xs font-mono font-black uppercase tracking-widest text-amber-500 dark:text-amber-400">
                  <Cpu className="w-4 h-4" />
                  <span>RELATED INTELLIGENCE TOOLS</span>
                </div>

                <div className="space-y-2">
                  {[
                    { label: `${activeFranchiseCode} Squad Explorer`, sub: "Current squad, roles and player profiles", href: `/dugout/${activeFranchiseCode.toLowerCase()}#squad` },
                    { label: `${activeFranchiseCode} Match Analysis`, sub: "Detailed match reports and insights", href: "/feed" },
                    { label: "Player Comparisons", sub: "Compare players with league stars", href: "/scout/compare" },
                    { label: `${activeFranchiseCode} Auction Strategy`, sub: "Past auctions, value and retention analysis", href: "/arcade/auction-room" },
                    { label: "Franchise Timeline", sub: "Key moments across IPL seasons", href: `/dugout/${activeFranchiseCode.toLowerCase()}#history` },
                  ].map((tool) => (
                    <Link key={tool.label} href={tool.href}>
                      <div className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] dark:border-white/5 dark:hover:border-white/20 transition-all flex items-center justify-between cursor-pointer group">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">
                            {tool.label}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {tool.sub}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-white/40 group-hover:translate-x-1 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-transform shrink-0 ml-2" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ═════════════════════════════════════════════════════════════════
              4. CROSS-FRANCHISE SWITCHER (LEAGUE INTEL & DUGOUT DIRECTORY)
             ═════════════════════════════════════════════════════════════════ */}
          <section className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C1322] p-6 sm:p-8 shadow-sm dark:shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] text-[10px] font-mono font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
                  <Compass className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>FRANCHISE DIRECTORY</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Explore Rival Dugouts &amp; League Intel
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Track tactical evolutions, auction blue-prints, and squad telemetry across all 10 IPL franchises.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                <Link href="/teams">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/30 text-slate-800 dark:text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Browse All Franchises</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Quick-Jump Franchise Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
              {(["CSK", "MI", "RCB", "KKR", "SRH", "RR", "DC", "PBKS", "GT", "LSG"] as const).map((code) => {
                const conf = FRANCHISE_INTELLIGENCE[code] ?? { name: code, accent: "#FFD11A" };
                const isActive = activeFranchiseCode === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      handleSelectFranchise(code);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`group relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-center cursor-pointer ${
                      isActive
                        ? "border-primary/40 bg-primary/10 dark:border-white/40 dark:bg-white/10 shadow-md"
                        : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    }`}
                    style={isActive ? { borderColor: `${conf.accent}90` } : undefined}
                    title={`Switch intelligence view to ${conf.name}`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                      <TeamLogo team={code} size="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-mono font-bold text-slate-800 dark:text-white group-hover:text-primary dark:group-hover:text-amber-300 transition-colors flex items-center justify-center gap-1">
                        <span>{code}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
                        {isActive ? (
                          <span className="font-semibold" style={{ color: conf.accent }}>Active</span>
                        ) : (
                          conf.name.split(" ").slice(-1)[0]
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}
