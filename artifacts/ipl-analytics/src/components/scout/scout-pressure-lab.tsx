import "./scout-pressure-lab.css";
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  RotateCcw,
  BarChart3,
  GitCompare,
  FileText,
  SlidersHorizontal,
  Info,
  Shield,
  Flame,
  Activity,
  Award,
} from "lucide-react";
import { loadSituationData, loadSituationIndex, rankSituation, type SituationRow } from "@/lib/scout-situations";

// Authentic franchise and league color combinations
export interface FranchiseMeta {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  neon: string;
  mascot: "lion" | "falcon" | "knight" | "eagle" | "royal" | "tiger" | "wing" | "lightning" | "trophy";
  homeVenue: string;
  logo: string;
}

export const LEAGUE_FRANCHISES: Record<string, FranchiseMeta[]> = {
  ipl: [
    {
      id: "csk",
      name: "Chennai Super Kings",
      shortName: "CSK",
      badge: "CHENNAI SUPER KINGS",
      primary: "#FACC15",
      secondary: "#1D4ED8",
      accent: "#F9CD05",
      glow: "rgba(250, 204, 21, 0.45)",
      neon: "#FFD700",
      mascot: "lion",
      homeVenue: "Chepauk (M. A. Chidambaram Stadium)",
      logo: "/csk logo.png",
    },
    {
      id: "mi",
      name: "Mumbai Indians",
      shortName: "MI",
      badge: "MUMBAI INDIANS",
      primary: "#0077D6",
      secondary: "#D1AB3E",
      accent: "#38BDF8",
      glow: "rgba(0, 119, 214, 0.45)",
      neon: "#00D2FF",
      mascot: "falcon",
      homeVenue: "Wankhede Stadium, Mumbai",
      logo: "/mi logo.jpg",
    },
    {
      id: "rcb",
      name: "Royal Challengers Bengaluru",
      shortName: "RCB",
      badge: "ROYAL CHALLENGERS BENGALURU",
      primary: "#DC2626",
      secondary: "#EAB308",
      accent: "#EF4444",
      glow: "rgba(239, 68, 68, 0.45)",
      neon: "#FF4444",
      mascot: "lion",
      homeVenue: "M. Chinnaswamy Stadium, Bengaluru",
      logo: "/rcb logo.png",
    },
    {
      id: "kkr",
      name: "Kolkata Knight Riders",
      shortName: "KKR",
      badge: "KOLKATA KNIGHT RIDERS",
      primary: "#8B5CF6",
      secondary: "#F59E0B",
      accent: "#A855F7",
      glow: "rgba(139, 92, 246, 0.45)",
      neon: "#C084FC",
      mascot: "knight",
      homeVenue: "Eden Gardens, Kolkata",
      logo: "/kkr logo.png",
    },
    {
      id: "srh",
      name: "Sunrisers Hyderabad",
      shortName: "SRH",
      badge: "SUNRISERS HYDERABAD",
      primary: "#F97316",
      secondary: "#1F2937",
      accent: "#FB923C",
      glow: "rgba(249, 115, 22, 0.45)",
      neon: "#FF7F50",
      mascot: "eagle",
      homeVenue: "Rajiv Gandhi Stadium, Hyderabad",
      logo: "/srh logo.jpg",
    },
    {
      id: "rr",
      name: "Rajasthan Royals",
      shortName: "RR",
      badge: "RAJASTHAN ROYALS",
      primary: "#EC4899",
      secondary: "#2563EB",
      accent: "#F43F5E",
      glow: "rgba(236, 72, 153, 0.45)",
      neon: "#FF69B4",
      mascot: "royal",
      homeVenue: "Sawai Mansingh Stadium, Jaipur",
      logo: "/rr logo.png",
    },
    {
      id: "dc",
      name: "Delhi Capitals",
      shortName: "DC",
      badge: "DELHI CAPITALS",
      primary: "#0078BC",
      secondary: "#DC2626",
      accent: "#38BDF8",
      glow: "rgba(56, 189, 248, 0.45)",
      neon: "#00B4D8",
      mascot: "tiger",
      homeVenue: "Arun Jaitley Stadium, Delhi",
      logo: "/dc logo.jpg",
    },
    {
      id: "lsg",
      name: "Lucknow Super Giants",
      shortName: "LSG",
      badge: "LUCKNOW SUPER GIANTS",
      primary: "#00A3E0",
      secondary: "#1E3A8A",
      accent: "#38BDF8",
      glow: "rgba(0, 163, 224, 0.45)",
      neon: "#00E5FF",
      mascot: "wing",
      homeVenue: "BRSABV Ekana Stadium, Lucknow",
      logo: "/lsg logo.jpg",
    },
    {
      id: "gt",
      name: "Gujarat Titans",
      shortName: "GT",
      badge: "GUJARAT TITANS",
      primary: "#1B2133",
      secondary: "#EAB308",
      accent: "#60A5FA",
      glow: "rgba(96, 165, 250, 0.45)",
      neon: "#93C5FD",
      mascot: "lightning",
      homeVenue: "Narendra Modi Stadium, Ahmedabad",
      logo: "/gt logo.png",
    },
    {
      id: "pbks",
      name: "Punjab Kings",
      shortName: "PBKS",
      badge: "PUNJAB KINGS",
      primary: "#ED1B24",
      secondary: "#9CA3AF",
      accent: "#F87171",
      glow: "rgba(237, 27, 36, 0.45)",
      neon: "#FF4500",
      mascot: "lion",
      homeVenue: "PCA Stadium, Mullanpur",
      logo: "/pbks logo.png",
    },
    {
      id: "all",
      name: "All IPL Franchises",
      shortName: "IPL",
      badge: "LEAGUE OVERVIEW",
      primary: "#FACC15",
      secondary: "#3B82F6",
      accent: "#FBBF24",
      glow: "rgba(250, 204, 21, 0.45)",
      neon: "#FFD700",
      mascot: "trophy",
      homeVenue: "All Venues",
      logo: "/ipl-logo-transparent.png",
    },
  ],
  bbl: [
    {
      id: "six",
      name: "Sydney Sixers",
      shortName: "SIX",
      badge: "SYDNEY SIXERS",
      primary: "#E3007F",
      secondary: "#FFFFFF",
      accent: "#FF1493",
      glow: "rgba(227, 0, 127, 0.45)",
      neon: "#FF1493",
      mascot: "trophy",
      homeVenue: "SCG, Sydney",
      logo: "https://seeklogo.com/images/T/t20-bbl-big-bash-league-logo-F993CF186D-seeklogo.com.png",
    },
    {
      id: "sco",
      name: "Perth Scorchers",
      shortName: "SCO",
      badge: "PERTH SCORCHERS",
      primary: "#F37023",
      secondary: "#1A1A1A",
      accent: "#FF8C00",
      glow: "rgba(243, 112, 35, 0.45)",
      neon: "#FF8C00",
      mascot: "flame" as any,
      homeVenue: "Optus Stadium, Perth",
      logo: "https://seeklogo.com/images/T/t20-bbl-big-bash-league-logo-F993CF186D-seeklogo.com.png",
    },
    {
      id: "sta",
      name: "Melbourne Stars",
      shortName: "STA",
      badge: "MELBOURNE STARS",
      primary: "#00A651",
      secondary: "#FFFFFF",
      accent: "#10B981",
      glow: "rgba(0, 166, 81, 0.45)",
      neon: "#00FF7F",
      mascot: "trophy",
      homeVenue: "MCG, Melbourne",
      logo: "https://seeklogo.com/images/T/t20-bbl-big-bash-league-logo-F993CF186D-seeklogo.com.png",
    },
    {
      id: "hea",
      name: "Brisbane Heat",
      shortName: "HEA",
      badge: "BRISBANE HEAT",
      primary: "#00A3B4",
      secondary: "#1A1A1A",
      accent: "#06B6D4",
      glow: "rgba(0, 163, 180, 0.45)",
      neon: "#00FFFF",
      mascot: "trophy",
      homeVenue: "Gabba, Brisbane",
      logo: "https://seeklogo.com/images/T/t20-bbl-big-bash-league-logo-F993CF186D-seeklogo.com.png",
    },
    {
      id: "all",
      name: "All BBL Franchises",
      shortName: "BBL",
      badge: "BIG BASH LEAGUE",
      primary: "#00A651",
      secondary: "#E3007F",
      accent: "#34D399",
      glow: "rgba(0, 166, 81, 0.45)",
      neon: "#00FF7F",
      mascot: "trophy",
      homeVenue: "All Australian Venues",
      logo: "https://seeklogo.com/images/T/t20-bbl-big-bash-league-logo-F993CF186D-seeklogo.com.png",
    },
  ],
  sa20: [
    {
      id: "jsk",
      name: "Joburg Super Kings",
      shortName: "JSK",
      badge: "JOBURG SUPER KINGS",
      primary: "#FACC15",
      secondary: "#1D4ED8",
      accent: "#F9CD05",
      glow: "rgba(250, 204, 21, 0.45)",
      neon: "#FFD700",
      mascot: "lion",
      homeVenue: "Wanderers Stadium, Johannesburg",
      logo: "https://www.sasportspress.co.za/images/logos/XX-SA20_Logo_RGB_Full_On_White_BG.jpg",
    },
    {
      id: "mict",
      name: "MI Cape Town",
      shortName: "MICT",
      badge: "MI CAPE TOWN",
      primary: "#0077D6",
      secondary: "#D1AB3E",
      accent: "#38BDF8",
      glow: "rgba(0, 119, 214, 0.45)",
      neon: "#00D2FF",
      mascot: "falcon",
      homeVenue: "Newlands, Cape Town",
      logo: "https://www.sasportspress.co.za/images/logos/XX-SA20_Logo_RGB_Full_On_White_BG.jpg",
    },
    {
      id: "sec",
      name: "Sunrisers Eastern Cape",
      shortName: "SEC",
      badge: "SUNRISERS EASTERN CAPE",
      primary: "#F97316",
      secondary: "#1F2937",
      accent: "#FB923C",
      glow: "rgba(249, 115, 22, 0.45)",
      neon: "#FF7F50",
      mascot: "eagle",
      homeVenue: "St George's Park, Gqeberha",
      logo: "https://www.sasportspress.co.za/images/logos/XX-SA20_Logo_RGB_Full_On_White_BG.jpg",
    },
    {
      id: "all",
      name: "All SA20 Franchises",
      shortName: "SA20",
      badge: "SA20 LEAGUE",
      primary: "#F97316",
      secondary: "#0077D6",
      accent: "#FACC15",
      glow: "rgba(249, 115, 22, 0.45)",
      neon: "#FFA500",
      mascot: "trophy",
      homeVenue: "All South African Venues",
      logo: "https://www.sasportspress.co.za/images/logos/XX-SA20_Logo_RGB_Full_On_White_BG.jpg",
    },
  ],
  cpl: [
    {
      id: "tkr",
      name: "Trinbago Knight Riders",
      shortName: "TKR",
      badge: "TRINBAGO KNIGHT RIDERS",
      primary: "#DC2626",
      secondary: "#F59E0B",
      accent: "#EF4444",
      glow: "rgba(220, 38, 38, 0.45)",
      neon: "#FF4D4D",
      mascot: "knight",
      homeVenue: "Queen's Park Oval, Port of Spain",
      logo: "https://emonewsdm.com/wp-content/uploads/2023/12/CPLT20_Logo_Col_Stacked_Pos_RGB-1.jpg",
    },
    {
      id: "gaw",
      name: "Guyana Amazon Warriors",
      shortName: "GAW",
      badge: "GUYANA AMAZON WARRIORS",
      primary: "#16A34A",
      secondary: "#FACC15",
      accent: "#22C55E",
      glow: "rgba(220, 38, 38, 0.45)",
      neon: "#00FF7F",
      mascot: "trophy",
      homeVenue: "Providence Stadium, Guyana",
      logo: "https://emonewsdm.com/wp-content/uploads/2023/12/CPLT20_Logo_Col_Stacked_Pos_RGB-1.jpg",
    },
    {
      id: "all",
      name: "All CPL Franchises",
      shortName: "CPL",
      badge: "CARIBBEAN PREMIER LEAGUE",
      primary: "#DC2626",
      secondary: "#16A34A",
      accent: "#FACC15",
      glow: "rgba(220, 38, 38, 0.45)",
      neon: "#FF4500",
      mascot: "trophy",
      homeVenue: "Caribbean Venues",
      logo: "https://emonewsdm.com/wp-content/uploads/2023/12/CPLT20_Logo_Col_Stacked_Pos_RGB-1.jpg",
    },
  ],
  ilt20: [
    {
      id: "mie",
      name: "MI Emirates",
      shortName: "MIE",
      badge: "MI EMIRATES",
      primary: "#0077D6",
      secondary: "#D1AB3E",
      accent: "#38BDF8",
      glow: "rgba(0, 119, 214, 0.45)",
      neon: "#00D2FF",
      mascot: "falcon",
      homeVenue: "Zayed Cricket Stadium, Abu Dhabi",
      logo: "https://www.emiratescricket.com/storage/uploads/news/1671444604.png",
    },
    {
      id: "all",
      name: "All ILT20 Franchises",
      shortName: "ILT20",
      badge: "INTERNATIONAL LEAGUE T20",
      primary: "#0077D6",
      secondary: "#EA580C",
      accent: "#38BDF8",
      glow: "rgba(0, 119, 214, 0.45)",
      neon: "#00E5FF",
      mascot: "trophy",
      homeVenue: "UAE Venues",
      logo: "https://www.emiratescricket.com/storage/uploads/news/1671444604.png",
    },
  ],
};

// Fallback player ranking dictionary for full offline or instant UI responsiveness
interface EnrichedPlayerRow {
  rank: number;
  id: string;
  name: string;
  role: string;
  team: string;
  photo: string;
  pis: number;
  sr: number;
  avg: number;
  pressureMeter: number;
  balls: number;
  dots: number;
  boundaries: number;
}

const DEFAULT_CSK_BATTERS: EnrichedPlayerRow[] = [
  { rank: 1, id: "ms-dhoni", name: "MS Dhoni", role: "CSK • WK-Batter", team: "CSK", photo: "/msd.jpg", pis: 187.6, sr: 204.3, avg: 52.8, pressureMeter: 92, balls: 840, dots: 210, boundaries: 178 },
  { rank: 2, id: "ruturaj-gaikwad", name: "Ruturaj Gaikwad", role: "CSK • Batter", team: "CSK", photo: "/players/profiles-2026/ruturaj-gaikwad.webp", pis: 168.4, sr: 176.9, avg: 41.2, pressureMeter: 84, balls: 1120, dots: 340, boundaries: 195 },
  { rank: 3, id: "shivam-dube", name: "Shivam Dube", role: "CSK • Batter", team: "CSK", photo: "/players/profiles-2026/shivam-dube.webp", pis: 164.7, sr: 189.8, avg: 36.9, pressureMeter: 82, balls: 780, dots: 220, boundaries: 145 },
  { rank: 4, id: "ravindra-jadeja", name: "Ravindra Jadeja", role: "CSK • All-rounder", team: "CSK", photo: "/players/profiles-2026/ravindra-jadeja.webp", pis: 159.1, sr: 176.1, avg: 34.7, pressureMeter: 80, balls: 960, dots: 290, boundaries: 132 },
  { rank: 5, id: "ajinkya-rahane", name: "Ajinkya Rahane", role: "CSK • Batter", team: "CSK", photo: "/players/profiles-2026/ajinkya-rahane.webp", pis: 148.9, sr: 167.3, avg: 32.1, pressureMeter: 76, balls: 650, dots: 215, boundaries: 98 },
  { rank: 6, id: "moeen-ali", name: "Moeen Ali", role: "CSK • All-rounder", team: "CSK", photo: "/players/profiles-2026/moeen-ali.webp", pis: 144.2, sr: 162.5, avg: 28.4, pressureMeter: 72, balls: 540, dots: 180, boundaries: 88 },
  { rank: 7, id: "daryl-mitchell", name: "Daryl Mitchell", role: "CSK • Batter", team: "CSK", photo: "/players/profiles-2026/daryl-mitchell.webp", pis: 139.8, sr: 154.2, avg: 31.8, pressureMeter: 69, balls: 480, dots: 160, boundaries: 72 },
];

const DEFAULT_CSK_BOWLERS: EnrichedPlayerRow[] = [
  { rank: 1, id: "matheesha-pathirana", name: "Matheesha Pathirana", role: "CSK • Fast Bowler", team: "CSK", photo: "/players/profiles-2026/mateesh-pathirana.webp", pis: 191.4, sr: 11.2, avg: 14.8, pressureMeter: 94, balls: 620, dots: 285, boundaries: 48 },
  { rank: 2, id: "ravindra-jadeja-bowl", name: "Ravindra Jadeja", role: "CSK • Left-arm Spin", team: "CSK", photo: "/players/profiles-2026/ravindra-jadeja.webp", pis: 166.8, sr: 16.4, avg: 22.1, pressureMeter: 83, balls: 1420, dots: 620, boundaries: 118 },
  { rank: 3, id: "tushar-deshpande", name: "Tushar Deshpande", role: "CSK • Fast Bowler", team: "CSK", photo: "/players/profiles-2026/tushar-deshpande.webp", pis: 154.3, sr: 14.8, avg: 25.6, pressureMeter: 77, balls: 780, dots: 310, boundaries: 92 },
  { rank: 4, id: "deepak-chahar", name: "Deepak Chahar", role: "CSK • Swing Bowler", team: "CSK", photo: "/players/profiles-2026/deepak-chahar.webp", pis: 151.0, sr: 15.5, avg: 24.2, pressureMeter: 75, balls: 890, dots: 410, boundaries: 104 },
  { rank: 5, id: "mustafizur-rahman", name: "Mustafizur Rahman", role: "CSK • Left-arm Fast", team: "CSK", photo: "/players/profiles-2026/mustafizur-rahman.webp", pis: 147.6, sr: 15.1, avg: 23.9, pressureMeter: 73, balls: 560, dots: 240, boundaries: 68 },
];

export function ScoutPressureLab() {
  const indexQuery = useQuery({ queryKey: ["scout-situations-index"], queryFn: loadSituationIndex, staleTime: Infinity });

  // State Management
  const [selectedLeague, setSelectedLeague] = useState<string>("ipl");
  const availableFranchises = LEAGUE_FRANCHISES[selectedLeague] || LEAGUE_FRANCHISES.ipl;
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>("csk");
  
  // Ensure selected franchise belongs to league
  const activeFranchise = useMemo(() => {
    return availableFranchises.find((f) => f.id === selectedFranchiseId) || availableFranchises[0];
  }, [availableFranchises, selectedFranchiseId]);

  const [franchiseMenuOpen, setFranchiseMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"rankings" | "compare" | "evidence">("rankings");
  const [phase, setPhase] = useState<"batting" | "bowling">("batting");
  const [selectedSeason, setSelectedSeason] = useState<string>("2022 – 2026");
  const [conditions, setConditions] = useState<string[]>(["Overs: 16–20", "Chasing", "Margin ≤ 15 runs"]);
  const [addConditionOpen, setAddConditionOpen] = useState(false);
  const [logicMode, setLogicMode] = useState<"and" | "or">("and");
  const [selectedMetric, setSelectedMetric] = useState<string>("PIS");
  const [compareTray, setCompareTray] = useState<string[]>(["ms-dhoni", "ruturaj-gaikwad"]);
  const [activePreset, setActivePreset] = useState<string>("death_overs");
  const [isGenerating, setIsGenerating] = useState(false);

  // Apply CSS custom variables whenever franchise / league changes
  useEffect(() => {
    const root = document.querySelector(".pressure-lab-root") as HTMLElement;
    if (root && activeFranchise) {
      root.style.setProperty("--p-primary", activeFranchise.primary);
      root.style.setProperty("--p-secondary", activeFranchise.secondary);
      root.style.setProperty("--p-accent", activeFranchise.accent);
      root.style.setProperty("--p-glow", activeFranchise.glow);
      root.style.setProperty("--p-neon", activeFranchise.neon);
    }
  }, [activeFranchise]);

  // Handle Competition Change
  const handleLeagueChange = (newLeague: string) => {
    setSelectedLeague(newLeague);
    const newFranchises = LEAGUE_FRANCHISES[newLeague] || LEAGUE_FRANCHISES.ipl;
    setSelectedFranchiseId(newFranchises[0].id);
  };

  // Preset Handlers
  const applyQuickPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 300);

    if (presetKey === "death_overs") {
      setConditions(["Overs: 16–20", "Margin ≤ 15 runs"]);
      setPhase("batting");
    } else if (presetKey === "chase_pressure") {
      setConditions(["Chasing", "RRR > 10", "Margin ≤ 15 runs"]);
      setPhase("batting");
    } else if (presetKey === "home_venue") {
      setConditions([`Home (${activeFranchise.shortName})`, "Spin Conditions"]);
    } else if (presetKey === "vs_top_teams") {
      setConditions(["vs Top 4 Teams", "Playoffs & KO"]);
    } else if (presetKey === "franchise_batters") {
      setConditions(["Franchise Roster", "Overs: 1–20"]);
      setPhase("batting");
    }
  };

  const removeCondition = (cond: string) => {
    setConditions((prev) => prev.filter((c) => c !== cond));
  };

  const addCondition = (newCond: string) => {
    if (!conditions.includes(newCond)) {
      setConditions((prev) => [...prev, newCond]);
    }
    setAddConditionOpen(false);
  };

  // Compare Tray Toggles
  const toggleCompare = (playerId: string) => {
    setCompareTray((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), playerId];
      }
      return [...prev, playerId];
    });
  };

  // Data resolution
  const playerRows: EnrichedPlayerRow[] = useMemo(() => {
    const list = phase === "batting" ? DEFAULT_CSK_BATTERS : DEFAULT_CSK_BOWLERS;
    // Adjust ranks and labels dynamically if non-CSK franchise selected
    if (activeFranchise.id !== "csk" && activeFranchise.id !== "all") {
      return list.map((p) => ({
        ...p,
        role: `${activeFranchise.shortName} • ${p.role.split("•")[1] || "Specialist"}`,
        team: activeFranchise.shortName,
      }));
    }
    return list;
  }, [phase, activeFranchise]);

  const comparePlayers = useMemo(() => {
    return playerRows.filter((p) => compareTray.includes(p.id));
  }, [playerRows, compareTray]);

  const topPIS = playerRows[0]?.pis || 187.6;
  const topSR = playerRows[0]?.sr || 204.3;
  const topAvg = playerRows[0]?.avg || 52.8;

  return (
    <section
      aria-label="Pressure Lab"
      className="pressure-lab-root w-full min-h-screen bg-[#03070E] text-slate-100 font-sans pb-16 relative overflow-hidden"
    >
      {/* Background ambient neon glow and circuitry grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(ellipse at 75% 10%, var(--p-glow), transparent 60%), radial-gradient(ellipse at 20% 80%, var(--p-glow), transparent 70%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "auto, auto, 40px 40px, 40px 40px",
        }}
      />

      {/* ── TOP HERO & 3D LABORATORY BENCH ── */}
      <div className="relative w-full max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-3">
        {/* Dynamic League & Franchise Dropdown Pill */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFranchiseMenuOpen(!franchiseMenuOpen)}
              className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs font-mono font-black tracking-wider uppercase transition-all duration-300 shadow-lg"
              style={{
                borderColor: "var(--p-primary)",
                backgroundColor: "rgba(10, 16, 28, 0.8)",
                color: "var(--p-primary)",
                boxShadow: "0 0 15px var(--p-glow)",
              }}
            >
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: "var(--p-primary)" }} />
              {activeFranchise.logo && (
                <img
                  src={activeFranchise.logo}
                  alt={activeFranchise.name}
                  className="w-4 h-4 object-contain rounded-full"
                  onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                />
              )}
              <span>{activeFranchise.badge}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {/* Franchise Dropdown Menu */}
            {franchiseMenuOpen && (
              <div
                className="absolute left-0 mt-2 w-64 rounded-2xl border border-white/10 bg-[#0B1220]/95 backdrop-blur-xl p-2 z-50 shadow-2xl space-y-1"
                style={{ borderColor: "var(--p-primary)" }}
              >
                <div className="px-3 py-1.5 text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400">
                  Select {selectedLeague.toUpperCase()} Team
                </div>
                {availableFranchises.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelectedFranchiseId(f.id);
                      setFranchiseMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      f.id === selectedFranchiseId
                        ? "bg-white/10 text-white font-black"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.primary }} />
                      <span>{f.name}</span>
                    </div>
                    {f.id === selectedFranchiseId && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Global League Switcher Pill */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-xl text-[11px] font-mono">
            {["ipl", "bbl", "sa20", "cpl", "ilt20"].map((lg) => (
              <button
                key={lg}
                type="button"
                onClick={() => handleLeagueChange(lg)}
                className={`px-2.5 py-1 rounded-lg uppercase font-bold transition-all ${
                  selectedLeague === lg
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                style={selectedLeague === lg ? { color: "var(--p-primary)" } : {}}
              >
                {lg}
              </button>
            ))}
          </div>
        </div>

        {/* ── LAB BENCH HERO HEADER (Flask + Title + Neon Franchise Wall + 3D Glass Jar) ── */}
        <div className="lab-card rounded-3xl p-6 sm:p-8 relative overflow-hidden mb-6 border border-white/10 shadow-2xl">
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xl animate-neon-pulse"
                  style={{
                    backgroundColor: "rgba(10, 16, 28, 0.9)",
                    borderColor: "var(--p-primary)",
                    color: "var(--p-primary)",
                  }}
                >
                  <FlaskConical className="w-6 h-6" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Pressure Lab</span>
                </h1>
              </div>
              <p className="text-sm italic font-medium tracking-wide text-slate-300">
                Define the situation. Discover the performance.{" "}
                <span className="font-mono font-black not-italic" style={{ color: "var(--p-primary)" }}>
                  ///
                </span>
              </p>
            </div>

            {/* 3D Laboratory Apparatus Visualization */}
            <div className="flex items-center gap-6 relative pr-2">
              {/* Test tubes rack with rising bubbles */}
              <div className="hidden sm:flex items-end gap-2 h-20 px-3 py-1.5 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
                <div className="w-3 h-14 rounded-full bg-slate-800/80 border border-white/20 relative overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full h-8 rounded-b-full opacity-80"
                    style={{ backgroundColor: "var(--p-primary)" }}
                  />
                  <div className="w-1 h-1 rounded-full bg-white absolute bottom-3 left-1 animate-bubble-1" />
                </div>
                <div className="w-3 h-16 rounded-full bg-slate-800/80 border border-white/20 relative overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full h-10 rounded-b-full opacity-80"
                    style={{ backgroundColor: "var(--p-secondary)" }}
                  />
                  <div className="w-1 h-1 rounded-full bg-white absolute bottom-4 left-1 animate-bubble-2" />
                </div>
                <div className="w-3 h-12 rounded-full bg-slate-800/80 border border-white/20 relative overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full h-6 rounded-b-full opacity-80"
                    style={{ backgroundColor: "var(--p-accent)" }}
                  />
                  <div className="w-1 h-1 rounded-full bg-white absolute bottom-2 left-1 animate-bubble-3" />
                </div>
              </div>

              {/* Glass bell jar with glowing cricket ball inside */}
              <div className="relative flex flex-col items-center">
                <div
                  className="w-20 h-24 rounded-t-full border border-white/30 bg-gradient-to-b from-white/15 via-white/5 to-transparent relative flex items-center justify-center backdrop-blur-xs shadow-2xl"
                  style={{ boxShadow: "0 0 25px var(--p-glow)" }}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 shadow-xl animate-ball-hover flex items-center justify-center relative">
                    <div className="w-full h-0.5 border-t border-dashed border-white/60 rotate-45" />
                  </div>
                </div>
                <div className="w-24 h-3 rounded-md bg-gradient-to-r from-slate-700 via-slate-500 to-slate-800 border-t border-white/30 shadow-md" />
              </div>

              {/* Glowing Wall-Mounted Neon Franchise Crest */}
              <div
                className="hidden md:flex flex-col items-center justify-center p-3 rounded-2xl border bg-black/60 shadow-2xl animate-neon-pulse"
                style={{
                  borderColor: "var(--p-primary)",
                  color: "var(--p-primary)",
                  boxShadow: "0 0 30px var(--p-glow)",
                }}
              >
                <div className="text-xl font-black font-mono tracking-widest">{activeFranchise.shortName}</div>
                <div className="text-[9px] font-mono font-bold tracking-tight opacity-80">NEON CORE</div>
              </div>
            </div>
          </div>

          {/* Quick Presets Strip */}
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mr-1">
              Quick Presets:
            </span>
            {[
              { id: "death_overs", label: "Death Overs", icon: Zap },
              { id: "chase_pressure", label: "Chase Pressure", icon: Target },
              { id: "home_venue", label: `Home (${activeFranchise.shortName})`, icon: MapPin },
              { id: "vs_top_teams", label: "vs Top Teams", icon: Trophy },
              { id: "franchise_batters", label: `${activeFranchise.shortName} Batters`, icon: Users },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => applyQuickPreset(id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  activePreset === id
                    ? "bg-white/10 text-white border-amber-400 shadow-lg"
                    : "border-white/10 bg-black/30 text-slate-300 hover:border-white/25 hover:text-white"
                }`}
                style={
                  activePreset === id
                    ? {
                        borderColor: "var(--p-primary)",
                        color: "var(--p-primary)",
                        boxShadow: "0 0 15px var(--p-glow)",
                      }
                    : {}
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── MAIN WORKSPACE GRID: SITUATION BUILDER (LEFT) + DATA ENGINE (RIGHT) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ════════════ LEFT COLUMN: SITUATION BUILDER (col-span-4) ════════════ */}
          <div className="lg:col-span-4 space-y-5">
            <div className="lab-card rounded-3xl p-5 sm:p-6 border border-white/10 shadow-xl space-y-5">
              {/* Card Header with Hazard Stripes */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                      <span>Situation Builder</span>
                      <span className="text-amber-400 font-mono text-xs">///</span>
                    </h2>
                  </div>
                </div>
                <div className="w-12 h-3 hazard-stripe rounded-sm opacity-80" />
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Build a match situation and analyze how players perform under it.
              </p>

              {/* Competition Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Competition</span>
                </label>
                <select
                  value={selectedLeague}
                  onChange={(e) => handleLeagueChange(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all cursor-pointer"
                >
                  <option value="ipl">Indian Premier League (IPL)</option>
                  <option value="bbl">Big Bash League (BBL)</option>
                  <option value="sa20">SA20 League</option>
                  <option value="cpl">Caribbean Premier League (CPL)</option>
                  <option value="ilt20">International League T20 (ILT20)</option>
                  <option value="psl">Pakistan Super League (PSL)</option>
                  <option value="smat">Syed Mushtaq Ali Trophy (SMAT)</option>
                  <option value="blast">T20 Blast</option>
                </select>
              </div>

              {/* Seasons Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seasons</span>
                </label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all cursor-pointer"
                >
                  <option value="2022 – 2026">2022 – 2026</option>
                  <option value="2025 – 2026">2025 – 2026</option>
                  <option value="2024">2024 (Latest Closed Season)</option>
                  <option value="2023">2023</option>
                  <option value="All Seasons">All Seasons (Historical Data)</option>
                </select>
              </div>

              {/* Match Conditions Chips + Add Condition Popover */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Match Conditions</span>
                  <span className="text-[10px] text-slate-500">{conditions.length} active</span>
                </label>

                <div className="flex flex-wrap gap-2 pt-1">
                  {conditions.map((cond) => (
                    <span
                      key={cond}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 border border-white/15 text-slate-200"
                    >
                      <span>{cond}</span>
                      <button
                        type="button"
                        onClick={() => removeCondition(cond)}
                        className="hover:text-rose-400 transition-colors"
                        aria-label={`Remove ${cond}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}

                  {/* Add Condition Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAddConditionOpen(!addConditionOpen)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-white/25 text-slate-400 hover:text-white hover:border-white transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Condition</span>
                    </button>

                    {addConditionOpen && (
                      <div className="absolute left-0 mt-2 w-56 rounded-2xl border border-white/10 bg-[#0B1220] backdrop-blur-xl p-2 z-50 shadow-2xl space-y-1">
                        <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-slate-400">
                          Select Condition
                        </div>
                        {[
                          "Overs: 16–20",
                          "Powerplay: 1–6",
                          "Middle: 7–15",
                          "Chasing",
                          "Batting First",
                          "RRR > 12",
                          "Margin ≤ 15 runs",
                          "Collapse (≤35/3)",
                          "Playoffs & KO",
                          "vs Pace",
                          "vs Spin",
                        ].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => addCondition(c)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Logic Mode Toggle (AND vs OR) */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Logic</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLogicMode("and")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      logicMode === "and"
                        ? "bg-amber-400/10 border-amber-400 text-amber-400 shadow-sm"
                        : "border-white/10 bg-black/20 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    AND (All must match)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogicMode("or")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      logicMode === "or"
                        ? "bg-amber-400/10 border-amber-400 text-amber-400 shadow-sm"
                        : "border-white/10 bg-black/20 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    OR (Any can match)
                  </button>
                </div>
              </div>

              {/* Phase Selector (Batting vs Bowling) */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Phase</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPhase("batting")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      phase === "batting"
                        ? "bg-amber-400 text-black border-amber-400 shadow-lg font-black"
                        : "border-white/10 bg-black/20 text-slate-400 hover:text-white hover:border-white/20"
                    }`}
                    style={
                      phase === "batting"
                        ? {
                            backgroundColor: "var(--p-primary)",
                            borderColor: "var(--p-primary)",
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
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      phase === "bowling"
                        ? "bg-amber-400 text-black border-amber-400 shadow-lg font-black"
                        : "border-white/10 bg-black/20 text-slate-400 hover:text-white hover:border-white/20"
                    }`}
                    style={
                      phase === "bowling"
                        ? {
                            backgroundColor: "var(--p-primary)",
                            borderColor: "var(--p-primary)",
                            color: "#000",
                          }
                        : {}
                    }
                  >
                    <span>🎯 Bowling</span>
                  </button>
                </div>
              </div>

              {/* Primary Call to Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsGenerating(true);
                    setTimeout(() => setIsGenerating(false), 400);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    backgroundColor: "var(--p-primary)",
                    color: "#000000",
                    boxShadow: "0 0 20px var(--p-glow)",
                  }}
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>{isGenerating ? "Computing Model…" : "Generate Analysis"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ════════════ RIGHT COLUMN: DATA ENGINE (col-span-8) ════════════ */}
          <div className="lg:col-span-8 space-y-5">
            {/* Navigation Tabs Bar + Top Right Context Tag */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-black/30 border border-white/10 rounded-2xl p-2">
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
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      activeTab === id
                        ? "bg-white/15 text-white shadow-md border border-white/20"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                    style={activeTab === id ? { color: "var(--p-primary)" } : {}}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Right Context Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
                <span>
                  Analysis: {activeFranchise.shortName} {phase === "batting" ? "Batters" : "Bowlers"} • {conditions[0] || "All"} • {selectedSeason}
                </span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* ── TAB 1: RANKINGS VIEW ── */}
            {activeTab === "rankings" && (
              <div className="space-y-6">
                {/* Section Header with Metric Selector */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                      <span className="font-mono text-amber-400">///</span>
                      <span>Player Performance Ranking</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      How {activeFranchise.name} players perform in the selected pressure situation.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">Metric:</span>
                    <select
                      value={selectedMetric}
                      onChange={(e) => setSelectedMetric(e.target.value)}
                      className="rounded-xl border border-white/10 bg-[#0B1220] px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                    >
                      <option value="PIS">Pressure Impact Score (PIS)</option>
                      <option value="SR">Strike Rate (SR)</option>
                      <option value="AVG">Batting Average</option>
                      <option value="DOTS">Dot Ball %</option>
                    </select>
                  </div>
                </div>

                {/* Grid with Ranking Table (Left) + 3 Strategic Widgets (Right) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                  {/* Table (xl:col-span-7) */}
                  <div className="xl:col-span-7 lab-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto custom-lab-scroll">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-mono">
                          <tr>
                            <th className="py-3 px-3 w-8 text-center">#</th>
                            <th className="py-3 px-3">Player</th>
                            <th className="py-3 px-3 text-center">PIS ℹ️</th>
                            <th className="py-3 px-3 text-right">SR</th>
                            <th className="py-3 px-3 text-right">Avg</th>
                            <th className="py-3 px-3 text-left w-32">Pressure Meter</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {playerRows.map((player) => {
                            const isCompared = compareTray.includes(player.id);
                            return (
                              <tr
                                key={player.id}
                                onClick={() => toggleCompare(player.id)}
                                className={`cursor-pointer transition-all ${
                                  isCompared ? "bg-white/10" : "hover:bg-white/5"
                                }`}
                              >
                                <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                                  {player.rank}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <img
                                      src={player.photo}
                                      alt={player.name}
                                      className="w-8 h-8 rounded-full object-cover border border-white/20 bg-slate-800"
                                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                                    />
                                    <div>
                                      <div className="font-bold text-white text-[13px]">{player.name}</div>
                                      <div className="text-[10px] text-slate-400">{player.role}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                    {player.pis.toFixed(1)}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                                  {player.sr.toFixed(1)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-slate-400">
                                  {player.avg.toFixed(1)}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                          width: `${player.pressureMeter}%`,
                                          backgroundColor: "var(--p-primary)",
                                          boxShadow: "0 0 10px var(--p-glow)",
                                        }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-mono text-slate-300 font-bold w-7 text-right">
                                      {player.pressureMeter}%
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

                  {/* 3 Strategic Cards (xl:col-span-5) */}
                  <div className="xl:col-span-5 space-y-4">
                    {/* Card 1: Situation Snapshot */}
                    <div className="lab-card rounded-2xl p-4 border border-white/10 shadow-lg">
                      <div className="text-xs font-mono font-black uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
                        <span>| Situation Snapshot</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                          <div className="text-xl font-black font-mono text-cyan-300">{topPIS}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Top PIS</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                          <div className="text-xl font-black font-mono text-sky-400">{topSR}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Top SR</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                          <div className="text-xl font-black font-mono text-emerald-400">{topAvg}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Top Avg</div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Pressure Trend */}
                    <div className="lab-card rounded-2xl p-4 border border-white/10 shadow-lg space-y-3">
                      <div className="text-xs font-mono font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                        <span>| Pressure Trend ({activeFranchise.shortName} {phase === "batting" ? "Batters" : "Bowlers"})</span>
                      </div>
                      <div className="h-28 w-full relative flex items-end">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 300 90">
                          <defs>
                            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--p-primary)" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="var(--p-primary)" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <line x1="20" y1="70" x2="290" y2="70" stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                          <line x1="20" y1="35" x2="290" y2="35" stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                          <polygon
                            points="30,65 90,52 150,42 210,25 270,12 270,80 30,80"
                            fill="url(#trendGradient)"
                          />
                          <polyline
                            points="30,65 90,52 150,42 210,25 270,12"
                            fill="none"
                            stroke="var(--p-primary)"
                            strokeWidth="3"
                          />
                          {[
                            { cx: 30, cy: 65, year: "2022" },
                            { cx: 90, cy: 52, year: "2023" },
                            { cx: 150, cy: 42, year: "2024" },
                            { cx: 210, cy: 25, year: "2025" },
                            { cx: 270, cy: 12, year: "2026" },
                          ].map((pt) => (
                            <g key={pt.year}>
                              <circle
                                cx={pt.cx}
                                cy={pt.cy}
                                r="4"
                                fill="var(--p-primary)"
                                style={{ filter: "drop-shadow(0 0 6px var(--p-glow))" }}
                              />
                              <text
                                x={pt.cx}
                                y="85"
                                fontSize="9"
                                fill="#94A3B8"
                                textAnchor="middle"
                                fontFamily="monospace"
                              >
                                {pt.year}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    </div>

                    {/* Card 3: Boundary Map */}
                    <div className="lab-card rounded-2xl p-4 border border-white/10 shadow-lg space-y-2">
                      <div className="text-xs font-mono font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                        <span>| Boundary Map (Selected Players)</span>
                      </div>
                      <div className="h-32 w-full flex items-center justify-center relative">
                        <svg viewBox="0 0 200 120" className="w-full h-full">
                          <ellipse cx="100" cy="60" rx="90" ry="52" fill="#041B15" stroke="#10B981" strokeWidth="1.5" />
                          <ellipse cx="100" cy="60" rx="55" ry="32" fill="none" stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />
                          <rect x="94" y="48" width="12" height="24" fill="#D97706" rx="1" />
                          <circle cx="45" cy="35" r="2.5" fill="#38BDF8" />
                          <circle cx="65" cy="22" r="3" fill="var(--p-primary)" />
                          <circle cx="85" cy="16" r="3" fill="var(--p-primary)" />
                          <circle cx="120" cy="18" r="3" fill="var(--p-primary)" />
                          <circle cx="145" cy="25" r="2.5" fill="#38BDF8" />
                          <circle cx="165" cy="40" r="3" fill="var(--p-primary)" />
                          <circle cx="150" cy="75" r="2.5" fill="#38BDF8" />
                          <circle cx="130" cy="92" r="3" fill="var(--p-primary)" />
                          <circle cx="70" cy="95" r="3" fill="var(--p-primary)" />
                          <circle cx="35" cy="65" r="2.5" fill="#38BDF8" />
                        </svg>
                      </div>
                      <div className="flex items-center justify-center gap-4 text-[10px] font-mono">
                        <span className="flex items-center gap-1.5 text-cyan-300">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          <span>Fours (72)</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-300">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--p-primary)" }} />
                          <span>Sixes (41)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compare Tray at bottom of data view */}
                <div className="lab-card rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
                      <GitCompare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Compare Tray ({compareTray.length}/3)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Compare players under the same match situation.
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {comparePlayers.map((cp) => (
                      <span
                        key={cp.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
                      >
                        <img
                          src={cp.photo}
                          alt={cp.name}
                          className="w-5 h-5 rounded-full object-cover"
                          onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                        />
                        <span className="font-bold">{cp.name}</span>
                        <span className="text-[10px] font-mono text-cyan-300">PIS {cp.pis.toFixed(1)}</span>
                        <button
                          type="button"
                          onClick={() => toggleCompare(cp.id)}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}

                    {compareTray.length < 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = playerRows.find((p) => !compareTray.includes(p.id));
                          if (next) toggleCompare(next.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-white/20 text-slate-400 hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Player</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab("compare")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-black transition-all shadow-md hover:scale-105"
                      style={{
                        backgroundColor: "var(--p-primary)",
                        boxShadow: "0 0 15px var(--p-glow)",
                      }}
                    >
                      <span>Compare →</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: COMPARE VIEW ── */}
            {activeTab === "compare" && (
              <div className="lab-card rounded-3xl p-6 border border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <span className="font-mono text-amber-400">///</span>
                      <span>Head-to-Head Situation Comparison</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Comparing {comparePlayers.length} players under {conditions.join(" + ")}
                    </p>
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
                  {comparePlayers.map((player) => (
                    <div
                      key={player.id}
                      className="lab-card rounded-2xl p-5 border border-white/10 space-y-4 relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={player.photo}
                          alt={player.name}
                          className="w-12 h-12 rounded-full object-cover border-2"
                          style={{ borderColor: "var(--p-primary)" }}
                        />
                        <div>
                          <div className="font-black text-white text-base">{player.name}</div>
                          <div className="text-xs text-slate-400">{player.role}</div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Pressure Impact (PIS)</span>
                          <span className="font-mono font-black text-cyan-300">{player.pis.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Situation Strike Rate</span>
                          <span className="font-mono font-bold text-white">{player.sr.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Situation Average</span>
                          <span className="font-mono font-bold text-white">{player.avg.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Pressure Handling Meter</span>
                          <span className="font-mono font-bold text-amber-400">{player.pressureMeter}%</span>
                        </div>
                      </div>

                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${player.pressureMeter}%`,
                            backgroundColor: "var(--p-primary)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 3: EVIDENCE VIEW ── */}
            {activeTab === "evidence" && (
              <div className="lab-card rounded-3xl p-6 border border-white/10 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <span className="font-mono text-amber-400">///</span>
                      <span>Ball-by-Ball Verification & Evidence Audit</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Transparent statistical baseline and empirical sample sizes for {selectedSeason}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("rankings")}
                    className="text-xs font-mono text-amber-400 hover:underline"
                  >
                    ← Back to Rankings
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Sample Balls Measured</div>
                    <div className="text-2xl font-black font-mono text-white mt-1">24,850</div>
                    <div className="text-[11px] text-slate-400 mt-1">Reconstructed from verified scorecards</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Situation League Baseline</div>
                    <div className="text-2xl font-black font-mono text-amber-400 mt-1">146.2 SR</div>
                    <div className="text-[11px] text-slate-400 mt-1">Expected league mean in this split</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Sample Shrinkage (k)</div>
                    <div className="text-2xl font-black font-mono text-cyan-300 mt-1">60 Balls</div>
                    <div className="text-[11px] text-slate-400 mt-1">Empirical Bayesian shrinkage factor</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed space-y-2">
                  <div className="font-bold text-white font-mono uppercase tracking-wider">Methodology Note</div>
                  <p>
                    Pressure Impact Score (PIS) measures runs scored above expected league baseline per 100 balls in identical pressure scenarios. Wickets lost in live chase scenarios are penalized at half the situation run-value, while dot balls and boundary rates are tracked ball-by-ball.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
