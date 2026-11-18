import "./scout-pressure-lab.css";
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  FlaskConical,
  Zap,
  Target,
  MapPin,
  Trophy,
  Users,
  Plus,
  X,
  ChevronDown,
  Check,
  Play,
  BarChart3,
  GitCompare,
  FileText,
  Crosshair,
  Calendar,
  Layers,
  Info,
  SlidersHorizontal,
} from "lucide-react";

// Full franchise & league registry with authentic primary and secondary color combinations
export interface FranchiseOption {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  primary: string;       // main accent (buttons, meters, highlights)
  secondary: string;     // contrasting secondary color
  glow: string;          // shadow/glow rgb
  neon: string;          // bright neon sign text color
  homeVenue: string;     // home venue name
  logo: string;
}

export const LEAGUES_CONFIG: Record<string, { name: string; franchises: FranchiseOption[] }> = {
  ipl: {
    name: "Indian Premier League (IPL)",
    franchises: [
      {
        id: "csk",
        name: "Chennai Super Kings",
        shortName: "CSK",
        badge: "CHENNAI SUPER KINGS",
        primary: "#FACC15",
        secondary: "#1D4ED8",
        glow: "rgba(250, 204, 21, 0.45)",
        neon: "#FFD700",
        homeVenue: "Chepauk",
        logo: "/csk logo.png",
      },
      {
        id: "mi",
        name: "Mumbai Indians",
        shortName: "MI",
        badge: "MUMBAI INDIANS",
        primary: "#0077D6",
        secondary: "#D1AB3E",
        glow: "rgba(0, 119, 214, 0.45)",
        neon: "#00D2FF",
        homeVenue: "Wankhede",
        logo: "/mi logo.jpg",
      },
      {
        id: "rcb",
        name: "Royal Challengers Bengaluru",
        shortName: "RCB",
        badge: "ROYAL CHALLENGERS BENGALURU",
        primary: "#DC2626",
        secondary: "#EAB308",
        glow: "rgba(220, 38, 38, 0.45)",
        neon: "#FF4444",
        homeVenue: "Chinnaswamy",
        logo: "/rcb logo.png",
      },
      {
        id: "kkr",
        name: "Kolkata Knight Riders",
        shortName: "KKR",
        badge: "KOLKATA KNIGHT RIDERS",
        primary: "#8B5CF6",
        secondary: "#F59E0B",
        glow: "rgba(139, 92, 246, 0.45)",
        neon: "#C084FC",
        homeVenue: "Eden Gardens",
        logo: "/kkr logo.png",
      },
      {
        id: "srh",
        name: "Sunrisers Hyderabad",
        shortName: "SRH",
        badge: "SUNRISERS HYDERABAD",
        primary: "#F97316",
        secondary: "#1F2937",
        glow: "rgba(249, 115, 22, 0.45)",
        neon: "#FF7F50",
        homeVenue: "Uppal",
        logo: "/srh logo.jpg",
      },
      {
        id: "rr",
        name: "Rajasthan Royals",
        shortName: "RR",
        badge: "RAJASTHAN ROYALS",
        primary: "#EC4899",
        secondary: "#2563EB",
        glow: "rgba(236, 72, 153, 0.45)",
        neon: "#FF69B4",
        homeVenue: "Sawai Mansingh",
        logo: "/rr logo.png",
      },
      {
        id: "dc",
        name: "Delhi Capitals",
        shortName: "DC",
        badge: "DELHI CAPITALS",
        primary: "#0078BC",
        secondary: "#DC2626",
        glow: "rgba(0, 120, 188, 0.45)",
        neon: "#00B4D8",
        homeVenue: "Arun Jaitley",
        logo: "/dc logo.jpg",
      },
      {
        id: "lsg",
        name: "Lucknow Super Giants",
        shortName: "LSG",
        badge: "LUCKNOW SUPER GIANTS",
        primary: "#00A3E0",
        secondary: "#1E3A8A",
        glow: "rgba(0, 163, 224, 0.45)",
        neon: "#00E5FF",
        homeVenue: "Ekana",
        logo: "/lsg logo.jpg",
      },
      {
        id: "gt",
        name: "Gujarat Titans",
        shortName: "GT",
        badge: "GUJARAT TITANS",
        primary: "#3B82F6",
        secondary: "#EAB308",
        glow: "rgba(59, 130, 246, 0.45)",
        neon: "#60A5FA",
        homeVenue: "Narendra Modi",
        logo: "/gt logo.png",
      },
      {
        id: "pbks",
        name: "Punjab Kings",
        shortName: "PBKS",
        badge: "PUNJAB KINGS",
        primary: "#ED1B24",
        secondary: "#9CA3AF",
        glow: "rgba(237, 27, 36, 0.45)",
        neon: "#FF4500",
        homeVenue: "Mullanpur",
        logo: "/pbks logo.png",
      },
      {
        id: "all",
        name: "All IPL Franchises",
        shortName: "IPL",
        badge: "LEAGUE OVERVIEW",
        primary: "#FACC15",
        secondary: "#3B82F6",
        glow: "rgba(250, 204, 21, 0.45)",
        neon: "#FFD700",
        homeVenue: "All Venues",
        logo: "/ipl-logo-transparent.png",
      },
    ],
  },
  bbl: {
    name: "Big Bash League (BBL)",
    franchises: [
      {
        id: "six",
        name: "Sydney Sixers",
        shortName: "SIX",
        badge: "SYDNEY SIXERS",
        primary: "#E3007F",
        secondary: "#FFFFFF",
        glow: "rgba(227, 0, 127, 0.45)",
        neon: "#FF1493",
        homeVenue: "SCG",
        logo: "/ipl-logo-transparent.png",
      },
      {
        id: "sco",
        name: "Perth Scorchers",
        shortName: "SCO",
        badge: "PERTH SCORCHERS",
        primary: "#F37023",
        secondary: "#1A1A1A",
        glow: "rgba(243, 112, 35, 0.45)",
        neon: "#FF8C00",
        homeVenue: "Optus Stadium",
        logo: "/ipl-logo-transparent.png",
      },
      {
        id: "sta",
        name: "Melbourne Stars",
        shortName: "STA",
        badge: "MELBOURNE STARS",
        primary: "#00A651",
        secondary: "#FFFFFF",
        glow: "rgba(0, 166, 81, 0.45)",
        neon: "#00FF7F",
        homeVenue: "MCG",
        logo: "/ipl-logo-transparent.png",
      },
      {
        id: "hea",
        name: "Brisbane Heat",
        shortName: "HEA",
        badge: "BRISBANE HEAT",
        primary: "#00A3B4",
        secondary: "#1A1A1A",
        glow: "rgba(0, 163, 180, 0.45)",
        neon: "#00FFFF",
        homeVenue: "Gabba",
        logo: "/ipl-logo-transparent.png",
      },
      {
        id: "all",
        name: "All BBL Franchises",
        shortName: "BBL",
        badge: "BIG BASH LEAGUE",
        primary: "#00A651",
        secondary: "#E3007F",
        glow: "rgba(0, 166, 81, 0.45)",
        neon: "#00FF7F",
        homeVenue: "Australian Venues",
        logo: "/ipl-logo-transparent.png",
      },
    ],
  },
  sa20: {
    name: "SA20 League",
    franchises: [
      {
        id: "jsk",
        name: "Joburg Super Kings",
        shortName: "JSK",
        badge: "JOBURG SUPER KINGS",
        primary: "#FACC15",
        secondary: "#1D4ED8",
        glow: "rgba(250, 204, 21, 0.45)",
        neon: "#FFD700",
        homeVenue: "Wanderers",
        logo: "/csk logo.png",
      },
      {
        id: "mict",
        name: "MI Cape Town",
        shortName: "MICT",
        badge: "MI CAPE TOWN",
        primary: "#0077D6",
        secondary: "#D1AB3E",
        glow: "rgba(0, 119, 214, 0.45)",
        neon: "#00D2FF",
        homeVenue: "Newlands",
        logo: "/mi logo.jpg",
      },
      {
        id: "sec",
        name: "Sunrisers Eastern Cape",
        shortName: "SEC",
        badge: "SUNRISERS EASTERN CAPE",
        primary: "#F97316",
        secondary: "#1F2937",
        glow: "rgba(249, 115, 22, 0.45)",
        neon: "#FF7F50",
        homeVenue: "St George's Park",
        logo: "/srh logo.jpg",
      },
      {
        id: "all",
        name: "All SA20 Franchises",
        shortName: "SA20",
        badge: "SA20 LEAGUE",
        primary: "#F97316",
        secondary: "#0077D6",
        glow: "rgba(249, 115, 22, 0.45)",
        neon: "#FFA500",
        homeVenue: "South African Venues",
        logo: "/ipl-logo-transparent.png",
      },
    ],
  },
  cpl: {
    name: "Caribbean Premier League (CPL)",
    franchises: [
      {
        id: "tkr",
        name: "Trinbago Knight Riders",
        shortName: "TKR",
        badge: "TRINBAGO KNIGHT RIDERS",
        primary: "#DC2626",
        secondary: "#F59E0B",
        glow: "rgba(220, 38, 38, 0.45)",
        neon: "#FF4D4D",
        homeVenue: "Queen's Park Oval",
        logo: "/kkr logo.png",
      },
      {
        id: "gaw",
        name: "Guyana Amazon Warriors",
        shortName: "GAW",
        badge: "GUYANA AMAZON WARRIORS",
        primary: "#16A34A",
        secondary: "#FACC15",
        glow: "rgba(22, 163, 74, 0.45)",
        neon: "#00FF7F",
        homeVenue: "Providence Stadium",
        logo: "/ipl-logo-transparent.png",
      },
      {
        id: "all",
        name: "All CPL Franchises",
        shortName: "CPL",
        badge: "CARIBBEAN PREMIER LEAGUE",
        primary: "#DC2626",
        secondary: "#16A34A",
        glow: "rgba(220, 38, 38, 0.45)",
        neon: "#FF4500",
        homeVenue: "Caribbean Venues",
        logo: "/ipl-logo-transparent.png",
      },
    ],
  },
  ilt20: {
    name: "International League T20 (ILT20)",
    franchises: [
      {
        id: "mie",
        name: "MI Emirates",
        shortName: "MIE",
        badge: "MI EMIRATES",
        primary: "#0077D6",
        secondary: "#D1AB3E",
        glow: "rgba(0, 119, 214, 0.45)",
        neon: "#00D2FF",
        homeVenue: "Zayed Stadium",
        logo: "/mi logo.jpg",
      },
      {
        id: "all",
        name: "All ILT20 Franchises",
        shortName: "ILT20",
        badge: "INTERNATIONAL LEAGUE T20",
        primary: "#0077D6",
        secondary: "#EA580C",
        glow: "rgba(0, 119, 214, 0.45)",
        neon: "#00E5FF",
        homeVenue: "UAE Venues",
        logo: "/ipl-logo-transparent.png",
      },
    ],
  },
};

// Player Performance Ranking Models (Matching the 5 visible rows from reference image)
interface PlayerPressureRow {
  rank: number;
  id: string;
  name: string;
  role: string;
  team: string;
  photo: string;
  pis: number;
  sr: number;
  avg: number;
  meterPct: number;
}

const CSK_BATTERS_DATA: PlayerPressureRow[] = [
  {
    rank: 1,
    id: "ms-dhoni",
    name: "MS Dhoni",
    role: "CSK • WK-Batter",
    team: "CSK",
    photo: "/msd.jpg",
    pis: 187.6,
    sr: 204.3,
    avg: 52.8,
    meterPct: 92,
  },
  {
    rank: 2,
    id: "ruturaj-gaikwad",
    name: "Ruturaj Gaikwad",
    role: "CSK • Batter",
    team: "CSK",
    photo: "/players/profiles-2026/ruturaj-gaikwad.webp",
    pis: 168.4,
    sr: 176.9,
    avg: 41.2,
    meterPct: 84,
  },
  {
    rank: 3,
    id: "shivam-dube",
    name: "Shivam Dube",
    role: "CSK • Batter",
    team: "CSK",
    photo: "/players/profiles-2026/shivam-dube.webp",
    pis: 164.7,
    sr: 189.8,
    avg: 36.9,
    meterPct: 82,
  },
  {
    rank: 4,
    id: "ravindra-jadeja",
    name: "Ravindra Jadeja",
    role: "CSK • All-rounder",
    team: "CSK",
    photo: "/players/profiles-2026/ravindra-jadeja.webp",
    pis: 159.1,
    sr: 176.1,
    avg: 34.7,
    meterPct: 80,
  },
  {
    rank: 5,
    id: "ajinkya-rahane",
    name: "Ajinkya Rahane",
    role: "CSK • Batter",
    team: "CSK",
    photo: "/players/profiles-2026/ajinkya-rahane.webp",
    pis: 148.9,
    sr: 167.3,
    avg: 32.1,
    meterPct: 76,
  },
];

const CSK_BOWLERS_DATA: PlayerPressureRow[] = [
  {
    rank: 1,
    id: "matheesha-pathirana",
    name: "Matheesha Pathirana",
    role: "CSK • Fast Bowler",
    team: "CSK",
    photo: "/players/profiles-2026/mateesh-pathirana.webp",
    pis: 191.4,
    sr: 11.2,
    avg: 14.8,
    meterPct: 94,
  },
  {
    rank: 2,
    id: "ravindra-jadeja-bowl",
    name: "Ravindra Jadeja",
    role: "CSK • Left-arm Spin",
    team: "CSK",
    photo: "/players/profiles-2026/ravindra-jadeja.webp",
    pis: 166.8,
    sr: 16.4,
    avg: 22.1,
    meterPct: 83,
  },
  {
    rank: 3,
    id: "tushar-deshpande",
    name: "Tushar Deshpande",
    role: "CSK • Fast Bowler",
    team: "CSK",
    photo: "/players/profiles-2026/tushar-deshpande.webp",
    pis: 154.3,
    sr: 14.8,
    avg: 25.6,
    meterPct: 77,
  },
  {
    rank: 4,
    id: "deepak-chahar",
    name: "Deepak Chahar",
    role: "CSK • Swing Bowler",
    team: "CSK",
    photo: "/players/profiles-2026/deepak-chahar.webp",
    pis: 151.0,
    sr: 15.5,
    avg: 24.2,
    meterPct: 75,
  },
  {
    rank: 5,
    id: "mustafizur-rahman",
    name: "Mustafizur Rahman",
    role: "CSK • Left-arm Fast",
    team: "CSK",
    photo: "/players/profiles-2026/mustafizur-rahman.webp",
    pis: 147.6,
    sr: 15.1,
    avg: 23.9,
    meterPct: 73,
  },
];

export function ScoutPressureLab() {
  // Navigation & Filter State
  const [selectedLeague, setSelectedLeague] = useState<string>("ipl");
  const leagueConfig = LEAGUES_CONFIG[selectedLeague] || LEAGUES_CONFIG.ipl;
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>("csk");
  const [franchiseMenuOpen, setFranchiseMenuOpen] = useState(false);

  const activeFranchise = useMemo(() => {
    return (
      leagueConfig.franchises.find((f) => f.id === selectedFranchiseId) ||
      leagueConfig.franchises[0]
    );
  }, [leagueConfig, selectedFranchiseId]);

  const [activeTab, setActiveTab] = useState<"rankings" | "compare" | "evidence">("rankings");
  const [phase, setPhase] = useState<"batting" | "bowling">("batting");
  const [selectedSeason, setSelectedSeason] = useState<string>("2022 – 2026");
  const [conditions, setConditions] = useState<string[]>([
    "Overs: 16–20",
    "Chasing",
    "Margin ≤ 15 runs",
  ]);
  const [addConditionOpen, setAddConditionOpen] = useState(false);
  const [logicMode, setLogicMode] = useState<"and" | "or">("and");
  const [selectedMetric, setSelectedMetric] = useState<string>("Pressure Impact Score (PIS)");
  const [compareTray, setCompareTray] = useState<string[]>(["ms-dhoni", "ruturaj-gaikwad"]);
  const [activePreset, setActivePreset] = useState<string>("death_overs");
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync CSS custom variables dynamically whenever team/league changes
  useEffect(() => {
    const root = document.querySelector(".pressure-lab-container") as HTMLElement;
    if (root && activeFranchise) {
      root.style.setProperty("--c-primary", activeFranchise.primary);
      root.style.setProperty("--c-secondary", activeFranchise.secondary);
      root.style.setProperty("--c-accent", activeFranchise.primary);
      root.style.setProperty("--c-glow", activeFranchise.glow);
      root.style.setProperty("--c-neon", activeFranchise.neon);
      root.style.setProperty("--c-meter", activeFranchise.primary);
    }
  }, [activeFranchise]);

  const handleLeagueChange = (newLeague: string) => {
    setSelectedLeague(newLeague);
    const newConfig = LEAGUES_CONFIG[newLeague] || LEAGUES_CONFIG.ipl;
    setSelectedFranchiseId(newConfig.franchises[0].id);
  };

  const removeCondition = (c: string) => {
    setConditions((prev) => prev.filter((item) => item !== c));
  };

  const addConditionItem = (c: string) => {
    if (!conditions.includes(c)) setConditions((prev) => [...prev, c]);
    setAddConditionOpen(false);
  };

  const applyPreset = (id: string) => {
    setActivePreset(id);
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 300);

    if (id === "death_overs") {
      setConditions(["Overs: 16–20", "Margin ≤ 15 runs"]);
      setPhase("batting");
    } else if (id === "chase_pressure") {
      setConditions(["Chasing", "RRR > 10", "Margin ≤ 15 runs"]);
      setPhase("batting");
    } else if (id === "home_venue") {
      setConditions([`Home (${activeFranchise.homeVenue})`, "Margin ≤ 15 runs"]);
    } else if (id === "vs_top_teams") {
      setConditions(["vs Top 4 Teams", "Playoffs & KO"]);
    } else if (id === "csk_batters") {
      setConditions(["Overs: 16–20", "Chasing", "Margin ≤ 15 runs"]);
      setPhase("batting");
    }
  };

  const toggleCompare = (pid: string) => {
    setCompareTray((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : prev.length < 3 ? [...prev, pid] : [prev[1], prev[2], pid]
    );
  };

  // Active player list
  const currentPlayers = useMemo(() => {
    const list = phase === "batting" ? CSK_BATTERS_DATA : CSK_BOWLERS_DATA;
    if (activeFranchise.id !== "csk" && activeFranchise.id !== "all") {
      return list.map((p) => ({
        ...p,
        role: `${activeFranchise.shortName} • ${p.role.split("•")[1] || "Specialist"}`,
        team: activeFranchise.shortName,
      }));
    }
    return list;
  }, [phase, activeFranchise]);

  const compareList = useMemo(() => {
    return currentPlayers.filter((p) => compareTray.includes(p.id));
  }, [currentPlayers, compareTray]);

  return (
    <div className="pressure-lab-container w-full min-h-screen bg-[#060B13] text-slate-100 font-sans pb-12 select-none">
      {/* ── TOP HERO HEADER (EXACT REPLICA OF REFERENCE IMAGE) ── */}
      <div className="relative w-full border-b border-[#141F2E] overflow-hidden bg-[#040810]">
        {/* Photographic / 3D Laboratory background image on the right */}
        <div
          className="absolute inset-y-0 right-0 w-full sm:w-[65%] lg:w-[55%] pointer-events-none opacity-85 z-0 bg-no-repeat bg-right-top bg-contain sm:bg-cover"
          style={{
            backgroundImage: `url('/pressure-lab-bg.jpg')`,
            backgroundPosition: "top 0px right 0px",
          }}
        />
        {/* Dark gradient mask ensuring left side text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#040810] via-[#040810]/90 sm:via-[#040810]/70 to-transparent pointer-events-none z-0" />

        <div className="relative z-10 w-full max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-4 space-y-3.5">
          {/* Top Left: Franchise Dropdown Pill */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setFranchiseMenuOpen(!franchiseMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm"
              style={{
                borderColor: "var(--c-primary)",
                color: "var(--c-primary)",
                backgroundColor: "rgba(10, 16, 28, 0.9)",
              }}
            >
              <span>{activeFranchise.badge}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {franchiseMenuOpen && (
              <div
                className="absolute left-0 mt-1.5 w-60 rounded-xl border border-white/10 bg-[#0B1220]/95 backdrop-blur-xl p-1.5 z-50 shadow-2xl space-y-0.5"
                style={{ borderColor: "var(--c-primary)" }}
              >
                <div className="px-2.5 py-1 text-[9px] font-mono font-bold tracking-widest uppercase text-slate-400">
                  Select Franchise ({selectedLeague.toUpperCase()})
                </div>
                {leagueConfig.franchises.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelectedFranchiseId(f.id);
                      setFranchiseMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      f.id === selectedFranchiseId
                        ? "bg-white/10 text-white font-black"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.primary }} />
                      <span>{f.name}</span>
                    </div>
                    {f.id === selectedFranchiseId && <Check className="w-3 h-3 text-amber-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Tagline */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-md"
              style={{
                borderColor: "var(--c-primary)",
                color: "var(--c-primary)",
                backgroundColor: "rgba(10, 16, 28, 0.9)",
              }}
            >
              <FlaskConical className="w-5 h-5" />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Pressure Lab</h1>
              <p className="text-xs sm:text-sm italic text-slate-300 font-medium">
                Define the situation. Discover the performance.{" "}
                <span className="not-italic font-mono font-black" style={{ color: "var(--c-primary)" }}>
                  ///
                </span>
              </p>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--c-primary)" }}>
              Quick Presets:
            </span>
            {[
              { id: "death_overs", label: "Death Overs", icon: Zap },
              { id: "chase_pressure", label: "Chase Pressure", icon: Target },
              { id: "home_venue", label: `Home (${activeFranchise.homeVenue})`, icon: MapPin },
              { id: "vs_top_teams", label: "vs Top Teams", icon: Trophy },
              { id: "csk_batters", label: `${activeFranchise.shortName} Batters`, icon: Users },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => applyPreset(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  activePreset === id
                    ? "bg-[#0c1524] text-white border-amber-400 shadow-sm"
                    : "bg-[#090F1A]/80 border-[#1B2636] text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
                style={activePreset === id ? { borderColor: "var(--c-primary)", color: "var(--c-primary)" } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN COCKPIT (LEFT: SITUATION BUILDER | RIGHT: DATA DASHBOARD) ── */}
      <div className="w-full max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ════════════ LEFT COLUMN: SITUATION BUILDER (lg:col-span-4 xl:col-span-3) ════════════ */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <div className="bg-[#090E17] border border-[#1A2535] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
              {/* Card Header with Reticle & Yellow Hazard Slashes */}
              <div className="flex items-center justify-between pb-1 border-b border-[#141E2C]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md border flex items-center justify-center text-amber-400" style={{ borderColor: "var(--c-primary)", color: "var(--c-primary)" }}>
                    <Crosshair className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm font-black tracking-tight text-white">Situation Builder</h2>
                </div>
                <div className="hazard-slashes text-xs tracking-tighter" style={{ color: "var(--c-primary)" }}>///</div>
              </div>

              <p className="text-[11px] text-slate-400 leading-snug">
                Build a match situation and analyze how players perform under it.
              </p>

              {/* Competition Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>Competition</span>
                </label>
                <select
                  value={selectedLeague}
                  onChange={(e) => handleLeagueChange(e.target.value)}
                  className="w-full rounded-xl border border-[#1B2738] bg-[#050912] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="ipl">IPL</option>
                  <option value="bbl">BBL</option>
                  <option value="sa20">SA20</option>
                  <option value="cpl">CPL</option>
                  <option value="ilt20">ILT20</option>
                </select>
              </div>

              {/* Seasons Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span>Seasons</span>
                </label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full rounded-xl border border-[#1B2738] bg-[#050912] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="2022 – 2026">2022 – 2026</option>
                  <option value="2025 – 2026">2025 – 2026</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="All Seasons">All Seasons</option>
                </select>
              </div>

              {/* Match Conditions Chips */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Target className="w-3 h-3 text-amber-400" />
                  <span>Match Conditions</span>
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0D1522] border border-[#1E2C3F] text-slate-200"
                    >
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => removeCondition(c)}
                        className="text-slate-400 hover:text-rose-400"
                        aria-label={`Remove ${c}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAddConditionOpen(!addConditionOpen)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-[#223147] text-slate-400 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Condition</span>
                    </button>

                    {addConditionOpen && (
                      <div className="absolute left-0 mt-1 w-48 rounded-xl border border-white/10 bg-[#0B1220] p-1.5 z-50 shadow-xl space-y-0.5">
                        {[
                          "Overs: 16–20",
                          "Powerplay: 1–6",
                          "Middle: 7–15",
                          "Chasing",
                          "Batting First",
                          "Margin ≤ 15 runs",
                          "RRR > 12",
                          "Collapse (≤35/3)",
                          "Playoffs & KO",
                        ].map((cond) => (
                          <button
                            key={cond}
                            type="button"
                            onClick={() => addConditionItem(cond)}
                            className="w-full text-left px-2 py-1 rounded-md text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                          >
                            {cond}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Logic Mode Radio Buttons */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Logic</label>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="logic"
                      checked={logicMode === "and"}
                      onChange={() => setLogicMode("and")}
                      className="accent-amber-400"
                    />
                    <span>AND (All must match)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="logic"
                      checked={logicMode === "or"}
                      onChange={() => setLogicMode("or")}
                      className="accent-amber-400"
                    />
                    <span>OR (Any can match)</span>
                  </label>
                </div>
              </div>

              {/* Phase Toggle (Batting vs Bowling) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Phase</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPhase("batting")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      phase === "batting"
                        ? "shadow-md font-black"
                        : "bg-[#060A13] border border-[#192434] text-slate-400 hover:text-white"
                    }`}
                    style={
                      phase === "batting"
                        ? {
                            backgroundColor: "var(--c-primary)",
                            color: "#000",
                          }
                        : {}
                    }
                  >
                    <span>✏️ Batting</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase("bowling")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      phase === "bowling"
                        ? "shadow-md font-black"
                        : "bg-[#060A13] border border-[#192434] text-slate-400 hover:text-white"
                    }`}
                    style={
                      phase === "bowling"
                        ? {
                            backgroundColor: "var(--c-primary)",
                            color: "#000",
                          }
                        : {}
                    }
                  >
                    <span>🎯 Bowling</span>
                  </button>
                </div>
              </div>

              {/* Big CTA Button */}
              <button
                type="button"
                onClick={() => {
                  setIsGenerating(true);
                  setTimeout(() => setIsGenerating(false), 350);
                }}
                className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg hover:brightness-110 active:scale-[0.99]"
                style={{
                  backgroundColor: "var(--c-primary)",
                  color: "#000",
                }}
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>{isGenerating ? "Analyzing Situations…" : "Generate Analysis"}</span>
              </button>
            </div>
          </div>

          {/* ════════════ RIGHT COLUMN: DATA DASHBOARD (lg:col-span-8 xl:col-span-9) ════════════ */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* Top Navigation Tabs Bar */}
            <div className="bg-[#090E17] border border-[#1A2535] rounded-2xl p-2 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-1.5">
                {[
                  { id: "rankings", label: "Rankings", icon: BarChart3 },
                  { id: "compare", label: "Compare", icon: GitCompare },
                  { id: "evidence", label: "Evidence", icon: FileText },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id as any)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === id
                        ? "text-black font-black shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                    style={
                      activeTab === id
                        ? {
                            backgroundColor: "var(--c-primary)",
                            color: "#000",
                          }
                        : {}
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Right Context Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#060A13] border border-[#1A2535] text-[11px] font-mono text-slate-300">
                <span>
                  Analysis: {activeFranchise.shortName} {phase === "batting" ? "Batters" : "Bowlers"} • {conditions[0]} • {conditions[1] || "All"} • {selectedSeason}
                </span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Main Content Area (Rankings Tab) */}
            {activeTab === "rankings" && (
              <div className="bg-[#090E17] border border-[#1A2535] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                {/* Subheader & Metric Dropdown */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#141E2C]">
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                      <span className="font-mono text-xs" style={{ color: "var(--c-primary)" }}>///</span>
                      <span>Player Performance Ranking</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      How {activeFranchise.shortName} players perform in the selected pressure situation.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">Metric:</span>
                    <select
                      value={selectedMetric}
                      onChange={(e) => setSelectedMetric(e.target.value)}
                      className="rounded-xl border border-[#1B2738] bg-[#050912] px-2.5 py-1 text-xs font-semibold text-white focus:outline-none cursor-pointer"
                    >
                      <option value="Pressure Impact Score (PIS)">Pressure Impact Score (PIS)</option>
                      <option value="Strike Rate (SR)">Strike Rate (SR)</option>
                      <option value="Batting Average">Batting Average</option>
                    </select>
                  </div>
                </div>

                {/* Dashboard Split: Table on Left (~62%) + 3 Widgets on Right (~38%) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                  {/* Left: Player Performance Ranking Table (xl:col-span-7) */}
                  <div className="xl:col-span-7 rounded-xl border border-[#162130] bg-[#050A13] overflow-hidden">
                    <div className="overflow-x-auto pressure-table-scroll">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#070D18] border-b border-[#141E2D] text-slate-400 font-mono text-[11px]">
                          <tr>
                            <th className="py-2.5 px-3 w-8 text-center">#</th>
                            <th className="py-2.5 px-3">Player</th>
                            <th className="py-2.5 px-3 text-center">PIS ℹ️</th>
                            <th className="py-2.5 px-3 text-right">SR</th>
                            <th className="py-2.5 px-3 text-right">Avg</th>
                            <th className="py-2.5 px-3 text-left w-36">Pressure Meter</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0F1826]">
                          {currentPlayers.map((player) => {
                            const isSelected = compareTray.includes(player.id);
                            return (
                              <tr
                                key={player.id}
                                onClick={() => toggleCompare(player.id)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected ? "bg-white/[0.07]" : "hover:bg-white/[0.03]"
                                }`}
                              >
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                                  {player.rank}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={player.photo}
                                      alt={player.name}
                                      className="w-7 h-7 rounded-full object-cover border border-white/20 bg-slate-800 shrink-0"
                                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                                    />
                                    <div className="min-w-0">
                                      <div className="font-bold text-white text-xs truncate">{player.name}</div>
                                      <div className="text-[10px] text-slate-400 truncate">{player.role}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-black bg-[#0C2B3A] text-[#38BDF8] border border-[#0284C7]/40">
                                    {player.pis.toFixed(1)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">
                                  {player.sr.toFixed(1)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                                  {player.avg.toFixed(1)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{
                                          width: `${player.meterPct}%`,
                                          backgroundColor: "var(--c-primary)",
                                        }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-slate-300 w-6 text-right">
                                      {player.meterPct}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right: 3 Stacked Widgets (xl:col-span-5) */}
                  <div className="xl:col-span-5 space-y-3.5">
                    {/* Widget 1: Situation Snapshot */}
                    <div className="bg-[#050A13] border border-[#162130] rounded-xl p-3.5 shadow-sm space-y-2">
                      <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                        <span className="text-cyan-400 font-black">|</span>
                        <span>Situation Snapshot</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-lg font-black font-mono text-[#38BDF8]">
                            {currentPlayers[0]?.pis || 187.6}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">Top PIS</div>
                        </div>
                        <div>
                          <div className="text-lg font-black font-mono text-[#60A5FA]">
                            {currentPlayers[0]?.sr || 204.3}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">Top SR</div>
                        </div>
                        <div>
                          <div className="text-lg font-black font-mono text-[#34D399]">
                            {currentPlayers[0]?.avg || 52.8}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">Top Avg</div>
                        </div>
                      </div>
                    </div>

                    {/* Widget 2: Pressure Trend Line Chart */}
                    <div className="bg-[#050A13] border border-[#162130] rounded-xl p-3.5 shadow-sm space-y-2">
                      <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                        <span className="text-cyan-400 font-black">|</span>
                        <span>Pressure Trend ({activeFranchise.shortName} {phase === "batting" ? "Batters" : "Bowlers"})</span>
                      </div>
                      <div className="h-28 w-full relative">
                        <svg className="w-full h-full" viewBox="0 0 280 85">
                          <defs>
                            <linearGradient id="yellowAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--c-primary)" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="var(--c-primary)" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          {/* Axis lines */}
                          <line x1="25" y1="65" x2="270" y2="65" stroke="rgba(255,255,255,0.08)" />
                          <line x1="25" y1="35" x2="270" y2="35" stroke="rgba(255,255,255,0.08)" />
                          <line x1="25" y1="10" x2="270" y2="10" stroke="rgba(255,255,255,0.08)" />
                          {/* Y-axis labels */}
                          <text x="2" y="68" fontSize="8" fill="#64748B" fontFamily="monospace">140</text>
                          <text x="2" y="38" fontSize="8" fill="#64748B" fontFamily="monospace">180</text>
                          <text x="2" y="13" fontSize="8" fill="#64748B" fontFamily="monospace">220</text>
                          {/* Area Polygon */}
                          <polygon
                            points="35,62 90,48 145,40 200,24 255,14 255,75 35,75"
                            fill="url(#yellowAreaGrad)"
                          />
                          {/* Trend Polyline */}
                          <polyline
                            points="35,62 90,48 145,40 200,24 255,14"
                            fill="none"
                            stroke="var(--c-primary)"
                            strokeWidth="2.5"
                          />
                          {/* Nodes */}
                          {[
                            { cx: 35, cy: 62, year: "2022" },
                            { cx: 90, cy: 48, year: "2023" },
                            { cx: 145, cy: 40, year: "2024" },
                            { cx: 200, cy: 24, year: "2025" },
                            { cx: 255, cy: 14, year: "2026" },
                          ].map((pt) => (
                            <g key={pt.year}>
                              <circle cx={pt.cx} cy={pt.cy} r="3.5" fill="var(--c-primary)" />
                              <text x={pt.cx} y="80" fontSize="8" fill="#94A3B8" textAnchor="middle" fontFamily="monospace">
                                {pt.year}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    </div>

                    {/* Widget 3: Boundary Map */}
                    <div className="bg-[#050A13] border border-[#162130] rounded-xl p-3.5 shadow-sm space-y-2">
                      <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                        <span className="text-cyan-400 font-black">|</span>
                        <span>Boundary Map (Selected Players)</span>
                      </div>
                      <div className="h-28 w-full flex items-center justify-center">
                        <svg viewBox="0 0 200 110" className="w-full h-full">
                          {/* Dark green field oval */}
                          <ellipse cx="100" cy="55" rx="88" ry="48" fill="#02241A" stroke="#059669" strokeWidth="1" />
                          {/* 30 yard circle */}
                          <ellipse cx="100" cy="55" rx="52" ry="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" />
                          {/* Center pitch */}
                          <rect x="95" y="44" width="10" height="22" fill="#78350F" rx="1" />
                          {/* Cyan dots = Fours */}
                          <circle cx="45" cy="38" r="2.5" fill="#38BDF8" />
                          <circle cx="155" cy="42" r="2.5" fill="#38BDF8" />
                          <circle cx="140" cy="78" r="2.5" fill="#38BDF8" />
                          <circle cx="40" cy="65" r="2.5" fill="#38BDF8" />
                          {/* Yellow dots = Sixes */}
                          <circle cx="68" cy="22" r="3" fill="var(--c-primary)" />
                          <circle cx="90" cy="15" r="3" fill="var(--c-primary)" />
                          <circle cx="118" cy="16" r="3" fill="var(--c-primary)" />
                          <circle cx="168" cy="35" r="3" fill="var(--c-primary)" />
                          <circle cx="132" cy="90" r="3" fill="var(--c-primary)" />
                          <circle cx="70" cy="92" r="3" fill="var(--c-primary)" />
                        </svg>
                      </div>
                      <div className="flex items-center justify-center gap-4 text-[10px] font-mono">
                        <span className="flex items-center gap-1 text-[#38BDF8]">
                          <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                          <span>Fours (72)</span>
                        </span>
                        <span className="flex items-center gap-1" style={{ color: "var(--c-primary)" }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--c-primary)" }} />
                          <span>Sixes (41)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom: Compare Tray (2/3) (Inside Dashboard card as in reference image) */}
                <div className="mt-4 pt-3 border-t border-[#141E2C] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md border flex items-center justify-center text-amber-400" style={{ borderColor: "var(--c-primary)", color: "var(--c-primary)" }}>
                      <Crosshair className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">Compare Tray ({compareTray.length}/3)</div>
                      <div className="text-[10px] text-slate-400">Compare players under the same situation.</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {compareList.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#060A13] border border-[#192434] text-xs text-white"
                      >
                        <img
                          src={p.photo}
                          alt={p.name}
                          className="w-4 h-4 rounded-full object-cover"
                          onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                        />
                        <span className="font-bold">{p.name}</span>
                        <span className="text-[10px] font-mono text-[#38BDF8]">PIS {p.pis.toFixed(1)}</span>
                        <button
                          type="button"
                          onClick={() => toggleCompare(p.id)}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {compareTray.length < 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = currentPlayers.find((p) => !compareTray.includes(p.id));
                          if (next) toggleCompare(next.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border border-dashed border-[#223147] text-slate-400 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Player</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab("compare")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#064E5B] text-[#38BDF8] border border-[#0891B2] hover:bg-[#085E6E] transition-all"
                    >
                      <span>Compare →</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Compare Tab View */}
            {activeTab === "compare" && (
              <div className="bg-[#090E17] border border-[#1A2535] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#141E2C]">
                  <div>
                    <h3 className="text-sm font-black text-white">Compare Situation Profiles</h3>
                    <p className="text-[11px] text-slate-400">Head-to-head performance under {conditions.join(", ")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("rankings")}
                    className="text-xs font-mono text-amber-400 hover:underline"
                  >
                    ← Back to Rankings
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {compareList.map((player) => (
                    <div key={player.id} className="bg-[#050A13] border border-[#162130] rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={player.photo}
                          alt={player.name}
                          className="w-10 h-10 rounded-full object-cover border-2"
                          style={{ borderColor: "var(--c-primary)" }}
                        />
                        <div>
                          <div className="font-bold text-white text-sm">{player.name}</div>
                          <div className="text-[10px] text-slate-400">{player.role}</div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-[#121B27] text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Pressure Impact (PIS)</span>
                          <span className="font-mono font-black text-[#38BDF8]">{player.pis.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Strike Rate (SR)</span>
                          <span className="font-mono font-bold text-white">{player.sr.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Average</span>
                          <span className="font-mono font-bold text-white">{player.avg.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Pressure Meter</span>
                          <span className="font-mono font-bold text-amber-400">{player.meterPct}%</span>
                        </div>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${player.meterPct}%`,
                            backgroundColor: "var(--c-primary)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Tab View */}
            {activeTab === "evidence" && (
              <div className="bg-[#090E17] border border-[#1A2535] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#141E2C]">
                  <div>
                    <h3 className="text-sm font-black text-white">Ball-by-Ball Verification Evidence</h3>
                    <p className="text-[11px] text-slate-400">Sample sizes and empirical baselines</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("rankings")}
                    className="text-xs font-mono text-amber-400 hover:underline"
                  >
                    ← Back to Rankings
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-[#050A13] rounded-xl p-3 border border-[#162130]">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Sample Balls</div>
                    <div className="text-xl font-black font-mono text-white mt-0.5">24,850</div>
                  </div>
                  <div className="bg-[#050A13] rounded-xl p-3 border border-[#162130]">
                    <div className="text-[10px] font-mono uppercase text-slate-400">League Baseline SR</div>
                    <div className="text-xl font-black font-mono text-amber-400 mt-0.5">146.2</div>
                  </div>
                  <div className="bg-[#050A13] rounded-xl p-3 border border-[#162130]">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Shrinkage Factor (k)</div>
                    <div className="text-xl font-black font-mono text-cyan-300 mt-0.5">60 b</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
