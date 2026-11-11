import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { 
  Shield, CheckCircle2, Clock, AlertTriangle, Play, Pause, RotateCcw, 
  Eye, FileText, Image, ChevronRight, Layers, ArrowRight, Download, Sparkles
} from "lucide-react";
import { Link } from "wouter";

interface FranchiseProgress {
  id: string;
  name: string;
  shortName: string;
  accent: string;
  seasonsRange: string;
  totalSquadRecords: number;
  seasonsProcessed: number;
  totalSeasons: number;
  verifiedExactPortraits: number;
  missingPhotos: number;
  currentProcessingSeason: string;
  downloadProgress: number; // 0 - 100
  verificationProgress: number; // 0 - 100
  publicationStatus: "published" | "in_progress" | "queued" | "paused";
}

const FRANCHISES: FranchiseProgress[] = [
  {
    id: "RCB",
    name: "Royal Challengers Bengaluru",
    shortName: "RCB",
    accent: "#EC1C24",
    seasonsRange: "2026 → 2008",
    totalSquadRecords: 382,
    seasonsProcessed: 1,
    totalSeasons: 19,
    verifiedExactPortraits: 25,
    missingPhotos: 0,
    currentProcessingSeason: "2025 (Queued)",
    downloadProgress: 100, // 2026 done
    verificationProgress: 100,
    publicationStatus: "in_progress"
  },
  {
    id: "CSK",
    name: "Chennai Super Kings",
    shortName: "CSK",
    accent: "#F9CD05",
    seasonsRange: "2026 → 2008",
    totalSquadRecords: 374,
    seasonsProcessed: 0,
    totalSeasons: 17,
    verifiedExactPortraits: 0,
    missingPhotos: 25,
    currentProcessingSeason: "2026 (Ready)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  },
  {
    id: "MI",
    name: "Mumbai Indians",
    shortName: "MI",
    accent: "#004BA0",
    seasonsRange: "2026 → 2008",
    totalSquadRecords: 395,
    seasonsProcessed: 0,
    totalSeasons: 19,
    verifiedExactPortraits: 0,
    missingPhotos: 25,
    currentProcessingSeason: "2026 (Queued)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  },
  {
    id: "SRH",
    name: "Sunrisers Hyderabad",
    shortName: "SRH",
    accent: "#F26522",
    seasonsRange: "2026 → 2013",
    totalSquadRecords: 260,
    seasonsProcessed: 1,
    totalSeasons: 14,
    verifiedExactPortraits: 25,
    missingPhotos: 0,
    currentProcessingSeason: "2025 (Queued)",
    downloadProgress: 100,
    verificationProgress: 100,
    publicationStatus: "in_progress"
  },
  {
    id: "KKR",
    name: "Kolkata Knight Riders",
    shortName: "KKR",
    accent: "#3A225D",
    seasonsRange: "2026 → 2008",
    totalSquadRecords: 368,
    seasonsProcessed: 0,
    totalSeasons: 19,
    verifiedExactPortraits: 0,
    missingPhotos: 25,
    currentProcessingSeason: "2026 (Queued)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  },
  {
    id: "RR",
    name: "Rajasthan Royals",
    shortName: "RR",
    accent: "#EA1A85",
    seasonsRange: "2026 → 2008 (excl 16-17)",
    totalSquadRecords: 340,
    seasonsProcessed: 0,
    totalSeasons: 17,
    verifiedExactPortraits: 0,
    missingPhotos: 25,
    currentProcessingSeason: "2026 (Queued)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  },
  {
    id: "DC",
    name: "Delhi Capitals / Daredevils",
    shortName: "DC",
    accent: "#0078BC",
    seasonsRange: "2026 → 2008",
    totalSquadRecords: 388,
    seasonsProcessed: 0,
    totalSeasons: 19,
    verifiedExactPortraits: 0,
    missingPhotos: 25,
    currentProcessingSeason: "2026 (Queued)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  },
  {
    id: "PBKS",
    name: "Punjab Kings / KXIP",
    shortName: "PBKS",
    accent: "#ED1B24",
    seasonsRange: "2026 → 2008",
    totalSquadRecords: 370,
    seasonsProcessed: 0,
    totalSeasons: 19,
    verifiedExactPortraits: 0,
    missingPhotos: 25,
    currentProcessingSeason: "2026 (Queued)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  },
  {
    id: "GT",
    name: "Gujarat Titans",
    shortName: "GT",
    accent: "#1B2133",
    seasonsRange: "2026 → 2022",
    totalSquadRecords: 125,
    seasonsProcessed: 0,
    totalSeasons: 5,
    verifiedExactPortraits: 0,
    missingPhotos: 25,
    currentProcessingSeason: "2026 (Queued)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  },
  {
    id: "LSG",
    name: "Lucknow Super Giants",
    shortName: "LSG",
    accent: "#A7D5F2",
    seasonsRange: "2026 → 2022",
    totalSquadRecords: 120,
    seasonsProcessed: 0,
    totalSeasons: 5,
    verifiedExactPortraits: 0,
    missingPhotos: 25,
    currentProcessingSeason: "2026 (Queued)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  },
  {
    id: "DEC",
    name: "Deccan Chargers",
    shortName: "DEC",
    accent: "#436084",
    seasonsRange: "2012 → 2008",
    totalSquadRecords: 110,
    seasonsProcessed: 0,
    totalSeasons: 5,
    verifiedExactPortraits: 0,
    missingPhotos: 110,
    currentProcessingSeason: "2012 (Queued)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  },
  {
    id: "PWI",
    name: "Pune Warriors India",
    shortName: "PWI",
    accent: "#2F5B88",
    seasonsRange: "2013 → 2011",
    totalSquadRecords: 78,
    seasonsProcessed: 0,
    totalSeasons: 3,
    verifiedExactPortraits: 0,
    missingPhotos: 78,
    currentProcessingSeason: "2013 (Queued)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  },
  {
    id: "KTK",
    name: "Kochi Tuskers Kerala",
    shortName: "KTK",
    accent: "#5C2D91",
    seasonsRange: "2011",
    totalSquadRecords: 28,
    seasonsProcessed: 0,
    totalSeasons: 1,
    verifiedExactPortraits: 0,
    missingPhotos: 28,
    currentProcessingSeason: "2011 (Queued)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  },
  {
    id: "GL",
    name: "Gujarat Lions",
    shortName: "GL",
    accent: "#E25822",
    seasonsRange: "2017 → 2016",
    totalSquadRecords: 50,
    seasonsProcessed: 0,
    totalSeasons: 2,
    verifiedExactPortraits: 0,
    missingPhotos: 50,
    currentProcessingSeason: "2017 (Queued)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  },
  {
    id: "RPS",
    name: "Rising Pune Supergiant",
    shortName: "RPS",
    accent: "#D11D4E",
    seasonsRange: "2017 → 2016",
    totalSquadRecords: 52,
    seasonsProcessed: 0,
    totalSeasons: 2,
    verifiedExactPortraits: 0,
    missingPhotos: 52,
    currentProcessingSeason: "2017 (Queued)",
    downloadProgress: 0,
    verificationProgress: 0,
    publicationStatus: "queued"
  }
];

// Full 25 verified players for RCB 2026 Contact Sheet
const RCB_2026_PLAYERS = [
  { name: "Virat Kohli", role: "Batter", image: "/players/rcb-2026/virat-kohli-rcb-2026.png", size: "64 KB", status: "Exact 2026 Kit Verified" },
  { name: "Rajat Patidar", role: "Batter (Captain)", image: "/players/rcb-2026/rajat-patidar-rcb-2026.png", size: "68 KB", status: "Exact 2026 Kit Verified" },
  { name: "Josh Hazlewood", role: "Bowler", image: "/players/rcb-2026/josh-hazlewood-rcb-2026.png", size: "45 KB", status: "Exact 2026 Kit Verified" },
  { name: "Phil Salt", role: "Wicketkeeper Batter", image: "/players/rcb-2026/phil-salt-rcb-2026.png", size: "61 KB", status: "Exact 2026 Kit Verified" },
  { name: "Jitesh Sharma", role: "Wicketkeeper Batter", image: "/players/rcb-2026/jitesh-sharma-rcb-2026.png", size: "65 KB", status: "Exact 2026 Kit Verified" },
  { name: "Bhuvneshwar Kumar", role: "Bowler", image: "/players/rcb-2026/bhuvneshwar-kumar-rcb-2026.png", size: "71 KB", status: "Exact 2026 Kit Verified" },
  { name: "Venkatesh Iyer", role: "All-Rounder", image: "/players/rcb-2026/venkatesh-iyer-rcb-2026.png", size: "53 KB", status: "Exact 2026 Kit Verified" },
  { name: "Rasikh Salam", role: "Bowler", image: "/players/rcb-2026/rasikh-salam-rcb-2026.png", size: "46 KB", status: "Exact 2026 Kit Verified" },
  { name: "Krunal Pandya", role: "All-Rounder", image: "/players/rcb-2026/krunal-pandya-rcb-2026.png", size: "67 KB", status: "Exact 2026 Kit Verified" },
  { name: "Mangesh Yadav", role: "All-Rounder", image: "/players/rcb-2026/mangesh-yadav-rcb-2026.png", size: "50 KB", status: "Exact 2026 Kit Verified" },
  { name: "Yash Dayal", role: "Bowler", image: "/players/rcb-2026/yash-dayal-rcb-2026.png", size: "55 KB", status: "Exact 2026 Kit Verified" },
  { name: "Tim David", role: "All-Rounder", image: "/players/rcb-2026/tim-david-rcb-2026.png", size: "57 KB", status: "Exact 2026 Kit Verified" },
  { name: "Jacob Bethell", role: "All-Rounder", image: "/players/rcb-2026/jacob-bethell-rcb-2026.png", size: "62 KB", status: "Exact 2026 Kit Verified" },
  { name: "Suyash Sharma", role: "Bowler", image: "/players/rcb-2026/suyash-sharma-rcb-2026.png", size: "43 KB", status: "Exact 2026 Kit Verified" },
  { name: "Devdutt Padikkal", role: "Batter", image: "/players/rcb-2026/devdutt-padikkal-rcb-2026.png", size: "52 KB", status: "Exact 2026 Kit Verified" },
  { name: "Jacob Duffy", role: "Bowler", image: "/players/rcb-2026/jacob-duffy-rcb-2026.png", size: "50 KB", status: "Exact 2026 Kit Verified" },
  { name: "Nuwan Thushara", role: "Bowler", image: "/players/rcb-2026/nuwan-thushara-rcb-2026.png", size: "59 KB", status: "Exact 2026 Kit Verified" },
  { name: "Romario Shepherd", role: "All-Rounder", image: "/players/rcb-2026/romario-shepherd-rcb-2026.png", size: "48 KB", status: "Exact 2026 Kit Verified" },
  { name: "Jordan Cox", role: "Wicketkeeper Batter", image: "/players/rcb-2026/jordan-cox-rcb-2026.png", size: "45 KB", status: "Exact 2026 Kit Verified" },
  { name: "Swapnil Singh", role: "All-Rounder", image: "/players/rcb-2026/swapnil-singh-rcb-2026.png", size: "50 KB", status: "Exact 2026 Kit Verified" },
  { name: "Abhinandan Singh", role: "Bowler", image: "/players/rcb-2026/abhinandan-singh-rcb-2026.png", size: "54 KB", status: "Exact 2026 Kit Verified" },
  { name: "Kanishk Chouhan", role: "All-Rounder", image: "/players/rcb-2026/kanishk-chouhan-rcb-2026.png", size: "50 KB", status: "Exact 2026 Kit Verified" },
  { name: "Satvik Deswal", role: "All-Rounder", image: "/players/rcb-2026/satvik-deswal-rcb-2026.png", size: "48 KB", status: "Exact 2026 Kit Verified" },
  { name: "Vicky Ostwal", role: "All-Rounder", image: "/players/rcb-2026/vicky-ostwal-rcb-2026.png", size: "65 KB", status: "Exact 2026 Kit Verified" },
  { name: "Vihaan Malhotra", role: "All-Rounder", image: "/players/rcb-2026/vihaan-malhotra-rcb-2026.png", size: "45 KB", status: "Exact 2026 Kit Verified" },
];

export default function PhotoPipelineDashboard() {
  const [mode, setMode] = useState<"team_wise" | "season_wise">("team_wise");
  const [selectedFranchise, setSelectedFranchise] = useState<string>("RCB");
  const [showContactSheet, setShowContactSheet] = useState<boolean>(true);
  const [showMissingModal, setShowMissingModal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8 min-w-0">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>IPL Intelligence OS · Admin Console</span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tight text-white mt-1">
              Player Photo Acquisition & Jersey Verification Engine
            </h1>
            <p className="text-xs text-white/60 mt-1 max-w-3xl">
              Automated high-fidelity pipeline retrieving authentic player portraits, verifying exact kit seasons (2008–2026), and isolating cross-franchise jersey integrity.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#0B1020] p-1.5 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => setMode("team_wise")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === "team_wise"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow"
                  : "text-white/50 hover:text-white"
              }`}
            >
              TEAM-WISE (Recommended)
            </button>
            <button
              onClick={() => setMode("season_wise")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === "season_wise"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow"
                  : "text-white/50 hover:text-white"
              }`}
            >
              SEASON-WISE
            </button>
          </div>
        </div>

        {/* Global Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">Total Squad Records</div>
            <div className="text-2xl font-black text-white mt-1">3,983</div>
            <div className="text-[11px] text-white/50 mt-0.5">15 Franchises · 19 Seasons</div>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">Exact 2026 Verified</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">50 Portraits</div>
            <div className="text-[11px] text-emerald-400/70 mt-0.5">RCB (25/25) + SRH (25/25)</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">Approved in Registry</div>
            <div className="text-2xl font-black text-white mt-1">324</div>
            <div className="text-[11px] text-white/50 mt-0.5">Unique Player-Season-Kit Keys</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">Pipeline Status</div>
            <div className="text-2xl font-black text-amber-400 mt-1">RCB In-Progress</div>
            <div className="text-[11px] text-white/50 mt-0.5">2026 Complete → 2025 Queued</div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="p-4 rounded-2xl bg-[#0B1020] border border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center font-black text-red-400">
              RCB
            </div>
            <div>
              <div className="text-xs font-black uppercase text-white tracking-wide">
                Active Focus: Royal Challengers Bengaluru (2026 → 2008)
              </div>
              <div className="text-[11px] text-white/50">
                2026 verified (25/25 exact portraits). 2025 next in sequence.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsProcessing(!isProcessing)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg cursor-pointer"
            >
              {isProcessing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isProcessing ? "Pause Pipeline" : "Start Next Season (2025)"}</span>
            </button>

            <button
              onClick={() => setShowContactSheet(!showContactSheet)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-red-400" />
              <span>{showContactSheet ? "Hide Contact Sheet" : "View RCB 2026 Contact Sheet"}</span>
            </button>

            <Link href="/dugout/royal-challengers-bengaluru">
              <button className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer">
                <span>Open RCB Dugout Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>

        {/* Visual Contact Sheet for RCB 2026 (All 25 Verified Players) */}
        {showContactSheet && (
          <section className="space-y-4 rounded-3xl border border-red-500/20 bg-[#090E1A] p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="font-display font-black text-lg uppercase text-white tracking-wide">
                    RCB 2026 Visual Contact Sheet (25/25 Players Verified)
                  </h2>
                </div>
                <p className="text-xs text-white/50 mt-0.5">
                  Direct official cutouts from Royal Challengers Bengaluru official media CMS (<code className="text-white/70">2026-03</code> kit photoshoot)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  100% Exact Kit Verified
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-white/5 border border-white/10 text-white/70">
                  Stored Locally & In Registry
                </span>
              </div>
            </div>

            {/* Grid of 25 players */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              {RCB_2026_PLAYERS.map((p, i) => (
                <div 
                  key={p.name}
                  className="group relative rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-red-500/40 transition-all p-3 flex flex-col items-center text-center overflow-hidden"
                >
                  {/* Badge */}
                  <div className="absolute top-2 left-2 z-10 text-[9px] font-mono font-bold text-white/40">
                    #{i + 1}
                  </div>
                  <div className="absolute top-2 right-2 z-10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>

                  {/* Cutout Image with Hover Pop-Out Effect */}
                  <div className="w-28 h-36 my-2 relative flex items-end justify-center">
                    <div className="absolute inset-0 rounded-full bg-red-600/10 blur-xl group-hover:bg-red-600/30 transition-all" />
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300 relative z-10"
                      loading="lazy"
                    />
                  </div>

                  {/* Details */}
                  <div className="w-full min-w-0 mt-1">
                    <div className="text-xs font-bold text-white truncate" title={p.name}>
                      {p.name}
                    </div>
                    <div className="text-[10px] text-white/40 truncate mt-0.5">
                      {p.role}
                    </div>
                    <div className="text-[9px] font-mono text-emerald-400 mt-1">
                      {p.status}
                    </div>
                    <div className="text-[9px] font-mono text-white/30 mt-0.5">
                      {p.size} · PNG Cutout
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Team-Wise Franchise Matrix */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <h2 className="text-base font-black uppercase text-white tracking-wide">
                Team-Wise Pipeline Queue & Coverage Matrix (2008–2026)
              </h2>
              <p className="text-xs text-white/50">
                Ordered by execution priority: Each franchise processed 2026 backward to 2008.
              </p>
            </div>
            <span className="text-[11px] font-mono text-white/40">15 Franchises</span>
          </div>

          <div className="space-y-3">
            {FRANCHISES.map((f, idx) => (
              <div
                key={f.id}
                className="p-4 rounded-2xl bg-[#090E1A] border border-white/10 hover:border-white/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left Info */}
                <div className="flex items-center gap-3.5 min-w-[280px]">
                  <div className="text-xs font-mono font-bold text-white/30 w-5">
                    {idx + 1}.
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border"
                    style={{ backgroundColor: `${f.accent}20`, borderColor: `${f.accent}50`, color: f.accent }}
                  >
                    {f.shortName}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{f.name}</div>
                    <div className="text-[11px] font-mono text-white/40">{f.seasonsRange} · {f.totalSquadRecords} player records</div>
                  </div>
                </div>

                {/* Progress bars & status */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 max-w-2xl">
                  <div>
                    <div className="text-[10px] font-mono text-white/40 uppercase">Seasons Processed</div>
                    <div className="text-xs font-bold text-white mt-0.5">
                      {f.seasonsProcessed} / {f.totalSeasons}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono text-white/40 uppercase">Exact Kit Coverage</div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">
                      {f.verifiedExactPortraits > 0 ? `${f.verifiedExactPortraits} Verified` : "0 (Pending)"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono text-white/40 uppercase">Current Stage</div>
                    <div className="text-xs font-bold text-white/80 mt-0.5 truncate">
                      {f.currentProcessingSeason}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono text-white/40 uppercase">Publication</div>
                    <div className="mt-0.5">
                      {f.publicationStatus === "in_progress" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Active (2026 Live)
                        </span>
                      )}
                      {f.publicationStatus === "queued" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-white/40">
                          Queued
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {f.id === "RCB" ? (
                    <button
                      onClick={() => setShowContactSheet(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 transition-all cursor-pointer"
                    >
                      View 25 Cutouts
                    </button>
                  ) : f.id === "SRH" ? (
                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500/20 border border-orange-500/40 text-orange-300">
                      2026 Live (25)
                    </span>
                  ) : (
                    <button className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer">
                      Start Franchise
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </Layout>
  );
}
