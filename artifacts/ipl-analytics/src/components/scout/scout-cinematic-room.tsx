import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { evaluateSRHSuitability } from "@/lib/scout-suitability";
import { askScoutConversation, type ScoutConversationReply, type ScoutTurn } from "@/lib/scout-conversation";
import {
  Search,
  Eye,
  ChevronDown,
  Globe2,
  SlidersHorizontal,
  ArrowRight,
  BookmarkCheck,
  Bookmark,
  CheckSquare,
  Square,
  Shield,
  Layers,
  Sparkles,
  ExternalLink,
  Flame,
  Award,
  Zap,
  TrendingUp,
  RotateCcw,
  Coffee,
  CheckCircle2,
  Bell,
  ShoppingBag
} from "lucide-react";
import { useTeamTheme, type TeamCode, TEAM_REGISTRY } from "@/lib/team-context";
import { CricFieldMascot } from "@/components/CricFieldMascot";
import { type Discipline, type MatchPhase, type ScoutRating } from "@/lib/scout-api";

interface ScoutCinematicRoomProps {
  discipline: Discipline;
  setDiscipline: (d: Discipline) => void;
  role: string;
  setRole: (r: string) => void;
  selectedComps: string[];
  setSelectedComps: React.Dispatch<React.SetStateAction<string[]>>;
  phase: MatchPhase;
  setPhase: (p: MatchPhase) => void;
  minBalls: number;
  setMinBalls: (b: number) => void;
  onAiCandidates: (players: ScoutRating[]) => void;
  results: ScoutRating[];
  searching: boolean;
  searchFailed: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedPlayer: ScoutRating | null;
  onSelectPlayer: (p: ScoutRating | null) => void;
  shortlist: ScoutRating[];
  onToggleShortlist: (id: string) => void;
  isShortlisted: (id: string) => boolean;
  onApplyPreset?: (preset: any) => void;
}

// Player Photo Resolver with exact sync for Vaibhav Suryavanshi and marquee talent
function resolveScoutPlayerPhoto(name?: string): string {
  if (!name) return "/arjun-menon.jpg";
  const lower = name.toLowerCase().trim();
  if (lower.includes("arjun") || lower.includes("menon")) return "/arjun-menon.jpg";
  if (lower.includes("suryavanshi") || lower.includes("vaibhav") || lower === "v suryavanshi") {
    return "/players/profiles-2026/vaibhav-suryavanshi.webp";
  }
  if (lower.includes("bumrah")) return "/bumrah.jpg";
  if (lower.includes("dhoni") || lower.includes("msd")) return "/msd.jpg";
  if (lower.includes("kohli")) return "/virat kohli.jpg";
  if (lower.includes("abhishek") || lower.includes("abhisek")) return "/abhisek sharma.jpg";
  if (lower.includes("mayank") && lower.includes("yadav")) return "/mayank yadav.jpg";
  if (lower.includes("pathirana")) return "/players/profiles-2026/mateesh-pathirana.webp";
  if (lower.includes("dube")) return "/players/profiles-2026/shivam-dube.webp";
  if (lower.includes("gaikwad") || lower.includes("ruturaj")) return "/players/profiles-2026/ruturaj-gaikwad.webp";
  if (lower.includes("jadeja")) return "/players/profiles-2026/ravindra-jadeja.webp";
  if (lower.includes("tilak")) return "/players/profiles-2026/tilak-varma.webp";
  if (lower.includes("rinku")) return "/players/profiles-2026/rinku-singh.webp";
  if (lower.includes("gill")) return "/players/profiles-2026/shubman-gill.webp";
  if (lower.includes("jaiswal")) return "/players/profiles-2026/yashasvi-jaiswal.webp";

  const kebab = lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `/players/profiles-2026/${kebab}.webp`;
}

// 6 Core Scouting Leagues
export const SCOUT_LEAGUES = [
  { code: "ipl", name: "IPL", region: "India", x: 62, y: 38, badge: "IPL" },
  { code: "smat", name: "SMAT", region: "India", x: 74, y: 32, badge: "SMAT" },
  { code: "bbl", name: "BBL", region: "Australia", x: 76, y: 64, badge: "BBL" },
  { code: "sa20", name: "SA20", region: "South Africa", x: 68, y: 82, badge: "SA20" },
  { code: "cpl", name: "CPL", region: "Caribbean", x: 38, y: 44, badge: "CPL" },
  { code: "ilt20", name: "ILT20", region: "UAE", x: 50, y: 66, badge: "ILT20" },
];

export function ScoutCinematicRoom({
  discipline,
  setDiscipline,
  role,
  setRole,
  selectedComps,
  setSelectedComps,
  phase,
  setPhase,
  minBalls,
  setMinBalls,
  onAiCandidates, results, searching, searchFailed,
  searchQuery,
  setSearchQuery,
  selectedPlayer,
  onSelectPlayer,
  shortlist,
  onToggleShortlist,
  isShortlisted,
  onApplyPreset,
}: ScoutCinematicRoomProps) {
  const { selectedTeam, setSelectedTeam, theme, allTeams } = useTeamTheme();
  const [franchiseDropdownOpen, setFranchiseDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [ageDropdownOpen, setAgeDropdownOpen] = useState(false);
  const [leagueDropdownOpen, setLeagueDropdownOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [selectedAge, setSelectedAge] = useState<string>("All");

  const [analystAnswer, setAnalystAnswer] = useState<ScoutConversationReply | null>(null);
  const [analystBusy, setAnalystBusy] = useState(false);
  const [askedQuestion, setAskedQuestion] = useState('');
  const [conversation, setConversation] = useState<ScoutTurn[]>([]);
  useEffect(() => { setConversation([]); setAnalystAnswer(null); onAiCandidates([]); }, [selectedTeam]);
  const [, navigateToResults] = useLocation();
  const askScout = async () => {
    const question = searchQuery.trim();
    if (question.length < 3) return;
    setSuggestionsOpen(false);
    navigateToResults(`/scout/results?q=${encodeURIComponent(question)}${selectedTeam ? `&team=${selectedTeam}` : ''}`);
  };
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(0);
  const selectResult = (player: ScoutRating) => {
    onSelectPlayer(player); setActiveTab('search'); setSuggestionsOpen(false);
    requestAnimationFrame(() => document.getElementById('scout-selected-player')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const [evaluatedTargetId, setEvaluatedTargetId] = useState<string | null>(null);
  const activeTarget = shortlist.find(player => player.cricsheet_id === evaluatedTargetId);
  const evaluation = useMemo(() => activeTarget ? evaluateSRHSuitability(activeTarget) : null, [activeTarget]);
  const [activeTab, setActiveTab] = useState<'search' | 'shortlist'>('search');
  const discoveryResults = results.filter(player => !isShortlisted(player.cricsheet_id));
  const saveTarget = (id: string) => { onToggleShortlist(id); if (!isShortlisted(id)) { setEvaluatedTargetId(id); onSelectPlayer(null); setActiveTab('search'); } };

  // Effective Theme Colors
  // If franchise chosen, use team accent; otherwise use the signature Pitch Lime from reference image
  const accentColor = theme?.accent || "var(--team-accent)";
  const secondaryColor = theme?.secondary || "#4CC9C0";
  const glowColor = theme?.glow || "rgba(184, 243, 107, 0.4)";
  const surfaceTint = theme?.surfaceTint || "rgba(184, 243, 107, 0.08)";

  // Showcase Player (Default to Arjun Menon from reference mockup if none selected or if selected is Arjun Menon)
  const defaultMockPlayer = {
    cricsheet_id: "arjun-menon-scout",
    name: "ARJUN MENON",
    flag: "🇮🇳",
    country: "India",
    roleSpec: "Right Hand Bat | Right Arm Medium Fast",
    meta: "Age 22 | India | SMAT, IPL, SA20",
    photo: "/arjun-menon.jpg",
    strengths: [
      "Finishes games well",
      "Strong against spin",
      "Good fielding",
    ],
    whyConsider:
      "Consistent in last 2 seasons across SMAT and SA20. High strike rate in death overs. Good fit for a middle-order / finisher role.",
    srDeath: "168",
    avgT20: "32.4",
    recentForm: [70, 85, 60, 92, 80],
  };

  const activeDossier = selectedPlayer
    ? {
        cricsheet_id: selectedPlayer.cricsheet_id,
        name: selectedPlayer.name.toUpperCase(),
        flag: selectedPlayer.competition === "ipl" || selectedPlayer.competition === "smat" ? "🇮🇳" : "🌐",
        country: selectedPlayer.competition === "ipl" || selectedPlayer.competition === "smat" ? "India" : "Overseas",
        roleSpec: selectedPlayer.discipline === "batting" 
          ? (selectedPlayer.role?.label || "Middle-order Batter") 
          : (selectedPlayer.role?.label || "Pace / Death Bowler"),
        meta: `Volume: ${selectedPlayer.balls}b | ${selectedPlayer.matches} Matches | ${selectedPlayer.competition.toUpperCase()}`,
        photo: resolveScoutPlayerPhoto(selectedPlayer.name),
        strengths: selectedPlayer.strengths?.length 
          ? selectedPlayer.strengths 
          : selectedPlayer.discipline === "batting" 
            ? ["Strength evidence not available for this sample"]
            : ["Strength evidence not available for this sample"],
        whyConsider: selectedPlayer.weaknesses?.length 
          ? `High impact potential. Focus area: ${selectedPlayer.weaknesses.join(", ")}.`
          : `Review ${selectedPlayer.matches} matches and ${selectedPlayer.balls} balls in ${selectedPlayer.competition.toUpperCase()} against the team requirements before recruiting.`,
        srDeath: selectedPlayer.metrics?.strike_rate?.value 
          ? selectedPlayer.metrics.strike_rate.value.toFixed(0) 
          : "168",
        avgT20: selectedPlayer.metrics?.dot_pct?.value 
          ? `${(100 - selectedPlayer.metrics.dot_pct.value).toFixed(1)}` 
          : "32.4",
        recentForm: [65, 80, 85, 92, 78],
      }
    : defaultMockPlayer;

  const isDossierShortlisted = isShortlisted(activeDossier.cricsheet_id);

  // Toggle league in filter
  const toggleLeague = (code: string) => {
    setSelectedComps((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Recent tactical searches from reference image
  const RECENT_SEARCHES = [
    { label: "Indian pace bowlers under 26", action: () => { setDiscipline("bowling"); setSearchQuery(""); setSelectedComps(["ipl", "smat"]); } },
    { label: "Left arm spin allrounders", action: () => { setDiscipline("bowling"); setSearchQuery(""); } },
    { label: "Death over specialists", action: () => { setDiscipline("bowling"); setPhase("death"); setRole("death_specialist"); } },
    { label: "Uncapped overseas batters", action: () => { setDiscipline("batting"); setSelectedComps(["bbl", "sa20", "cpl", "ilt20"]); } },
    { label: "Middle order anchors", action: () => { setDiscipline("batting"); setPhase("middle"); setRole("middle_order"); } },
  ];

  // Quick Action cards with authentic player silhouette illustrations
  const QUICK_CARDS = [
    {
      title: "Finisher",
      sub: "Find a",
      img: "/msd.jpg",
      action: () => {
        setDiscipline("batting");
        setPhase("death");
        setRole("finisher");
        setSearchQuery("");
      },
    },
    {
      title: "Fast Bowler",
      sub: "Find a",
      img: "/bumrah.jpg",
      action: () => {
        setDiscipline("bowling");
        setRole("death_specialist");
        setSearchQuery("");
      },
    },
    {
      title: "Young Talent",
      sub: "Find",
      img: "/abhisek sharma.jpg",
      action: () => {
        setMinBalls(60);
        setSearchQuery("young");
      },
    },
    {
      title: "a Player",
      sub: "Replace",
      img: "/virat kohli.jpg",
      action: () => {
        const el = document.getElementById("scout-workspace");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      },
    },
  ];

  return (
    <div 
      className="scout-cinematic-wrapper w-full bg-slate-50 dark:bg-[#03080E] text-slate-900 dark:text-[#EFF5F7] select-none relative overflow-hidden font-sans border-b border-slate-200 dark:border-[#142330]"
      style={{
        ["--scout-accent" as any]: accentColor,
        ["--scout-secondary" as any]: secondaryColor,
        ["--scout-glow" as any]: glowColor,
        ["--scout-tint" as any]: surfaceTint,
      }}
    >
      <div aria-hidden="true" className="absolute inset-0 opacity-20 pointer-events-none" style={{backgroundImage:`radial-gradient(ellipse at 65% 15%, ${accentColor}55, transparent 60%),linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px)`,backgroundSize:'auto,48px 48px,48px 48px'}}/>

      {/* ── CINEMATIC COMMAND CENTER (WAR ROOM) ── */}
      <div className="relative w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
        {/* Tactical Directive Sub-Header & Dynamic 10 IPL Franchise Dugout Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-200 dark:border-[#142330] relative z-20">
          <div className="flex items-center gap-3">
            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border shadow-sm transition-all duration-300"
              style={{
                borderColor: accentColor,
                backgroundColor: "rgba(0,0,0,0.6)",
                color: accentColor,
                boxShadow: `0 0 12px ${glowColor}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              {theme ? `${theme.shortName} DUGOUT • SCOUT ROOM ACTIVE` : "SCOUT LAB • TACTICAL RADAR ACTIVE"}
            </span>
            <span className="hidden xl:inline text-xs text-slate-500 dark:text-[#718594] font-mono">
              DIRECTIVE: 2026 AUCTION RETENTION & REPLACEMENT
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 10 IPL Franchise Dugout Switcher Bar + Global Option */}
            <div className="flex items-center gap-1 bg-white/90 dark:bg-[#071018]/90 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-md dark:shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                aria-pressed={!selectedTeam}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  !selectedTeam
                    ? "bg-[var(--team-accent)] text-[#050B11] shadow-[0_0_12px_rgba(184,243,107,0.5)] scale-105"
                    : "text-slate-600 dark:text-[#8E9FA9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
                title="Global Scout Room (Pitch Lime #B8F36B)"
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">GLOBAL</span>
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-0.5" />

              {allTeams.map((t) => {
                const isCur = selectedTeam === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTeam(t.id)}
                    aria-pressed={isCur}
                    title={`${t.name} (${t.shortName}) Dugout Palette`}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl p-1 border transition-all flex items-center justify-center cursor-pointer relative ${
                      isCur
                        ? "scale-110 shadow-md z-10"
                        : "opacity-60 hover:opacity-100 bg-slate-100 dark:bg-white/5 border-transparent hover:border-slate-300 dark:hover:border-white/20"
                    }`}
                    style={isCur ? {
                      borderColor: t.accent,
                      backgroundColor: t.surfaceTint,
                      boxShadow: `0 0 12px ${t.glow}`,
                    } : undefined}
                  >
                    <img src={t.logoImg} alt={t.shortName} className="w-full h-full object-contain" />
                    {isCur && (
                      <span 
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-black"
                        style={{ backgroundColor: t.accent }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Shortlist Count Badge */}
            {shortlist.length > 0 && (
              <a
                href="#scout-workspace"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold text-white transition-all cursor-pointer"
                style={{
                  borderColor: accentColor,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  boxShadow: `0 0 10px ${glowColor}`,
                }}
              >
                <BookmarkCheck className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span>Shortlist ({shortlist.length})</span>
              </a>
            )}
          </div>
        </div>

        {/* Top-Right Warm Lamp Flare & Franchise Ambient Glow */}
        <div 
          className="absolute -top-10 right-10 w-[600px] h-[600px] rounded-full blur-[150px] opacity-30 transition-all duration-700 pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />
        <div 
          className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full blur-[160px] opacity-15 transition-all duration-700 pointer-events-none"
          style={{ backgroundColor: secondaryColor }}
        />

        {/* Ambient Stadium Window Night Lighting Effect */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-gradient-to-b from-[#142636]/20 to-transparent blur-3xl pointer-events-none" />

        {/* Top Row: Directives + Globe + HUD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
          
          {/* ── LEFT COLUMN (5 cols): Directives & Search & Quick Cards ── */}
          <div className="lg:col-span-5 space-y-4">
            {/* Handwritten script eyebrow */}
            <div className="space-y-0.5">
              <p 
                className="font-serif italic text-xs sm:text-sm tracking-wide transition-colors"
                style={{ color: accentColor }}
              >
                {theme ? `${theme.name} • Dugout Intelligence` : "Different Leagues"}
              </p>
              <p className="font-serif italic text-[11px] sm:text-xs text-[#8295A2]">
                {theme ? theme.motto : "Same Mission To Find The Right Player"}
              </p>
            </div>

            {/* Display Typography with Franchise Crest Integration */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                {theme && (
                  <div 
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border-2 p-1.5 flex items-center justify-center shrink-0 bg-[#08121B] shadow-xl transition-all duration-300"
                    style={{ borderColor: accentColor, boxShadow: `0 0 20px ${glowColor}` }}
                  >
                    <img src={theme.logoImg} alt={theme.name} className="w-full h-full object-contain" />
                  </div>

                )}
                <div>
                  <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight uppercase leading-[0.95]">
                    {theme ? `${theme.shortName} ` : "SCOUT "}
                    <span style={{ color: accentColor }}>{theme ? "SCOUT ROOM" : "LAB"}</span>
                  </h1>
                  <h2 className="font-display font-bold text-xs sm:text-sm tracking-[0.18em] uppercase" style={{ color: accentColor }}>
                    {theme ? `${theme.city.toUpperCase()} DUGOUT • GLOBAL TARGETING` : "GLOBAL TALENT INTELLIGENCE"} <CricFieldMascot team={theme?.shortName || "default"} mood="analytical" size={24} className="inline-block ml-1.5 align-middle" />
                  </h2>
                </div>

              </div>
              <p className="text-[11px] sm:text-xs text-[#70828F] pt-0.5">
                {theme 
                  ? `One search. Six leagues. Scout players matching ${theme.shortName}'s tactical requirements.` 
                  : "One search. Six leagues. Find your next match-winner."}
              </p>
            </div>

            {/* Search Console Capsule */}
            <div className="relative pt-0.5">
              {(analystBusy || analystAnswer) && <section aria-label="Scout AI answer" aria-live="polite" className="mt-3 rounded-xl border border-white/15 bg-[#0c121a] p-4 text-xs">
                <div className="flex items-center justify-between gap-3"><h3 className="font-bold">{theme?.shortName ?? "Franchise"} Scout AI</h3><button type="button" aria-label="Close AI answer" onClick={() => setAnalystAnswer(null)} className="text-slate-400">Close</button></div>
                <button type="button" className="mt-2 text-[10px] text-slate-500 underline" onClick={() => { setConversation([]); setAnalystAnswer(null); onAiCandidates([]); }}>New conversation</button>
                {conversation.length > 2 && <details className="mt-2 text-[10px] text-slate-500"><summary>Earlier conversation</summary>{conversation.slice(0,-2).map((turn,index)=><p key={index} className="mt-2 whitespace-pre-wrap">{turn.role}: {turn.content}</p>)}</details>}
                <p className="my-2 text-slate-500">{askedQuestion}</p>
                {analystBusy ? <div role="status" className="flex items-center gap-3"><span className="scout-eye-ball"><Eye size={17}/></span>Reading warehouse evidence and preparing your answer…</div> : analystAnswer?.source === 'live_api' ? <>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-200">{analystAnswer.text}</p>
                  {analystAnswer.webStatus && <p className="mt-2 text-[10px] text-slate-500">{analystAnswer.webStatus}</p>}
                  {analystAnswer.webSources?.map(source => /^https:\/\//.test(source.url) && <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs underline">[{source.id}] {source.title} ↗</a>)}
                  {analystAnswer.limitations && <p className="mt-2 text-[10px] text-slate-400">Coverage: {analystAnswer.limitations}</p>}
                  {analystAnswer.candidates?.map(player => <div key={`${player.cricsheet_id}-${player.competition}`} className="mt-2 flex items-center justify-between rounded-lg border border-white/10 p-2"><button type="button" onClick={() => selectResult(player)} className="text-left">{player.name}<small className="block text-slate-500">{player.role.label} · {player.competition.toUpperCase()} · {player.balls} balls</small></button><button type="button" onClick={() => saveTarget(player.cricsheet_id)} className="rounded border border-white/15 px-2 py-1">{isShortlisted(player.cricsheet_id) ? 'Remove target' : 'Shortlist'}</button></div>)}
                  <p className="mt-3 text-[10px] text-slate-500">AI explanation — verify against the retrieved evidence. Coverage depends on the warehouse and supported query tools.</p>
                  {analystAnswer.evidence?.map(item => <details key={item.id} className="mt-2 rounded border border-white/10 p-2"><summary className="cursor-pointer">{item.id} · {item.tool} · {item.source}</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[10px]">{JSON.stringify(item.data,null,2)}</pre></details>)}
                </> : <p role="alert" className="text-slate-400">{analystAnswer?.error ?? 'Unable to answer this question. Try again.'}</p>}
              </section>}
              {suggestionsOpen && <div id="scout-search-results" role="listbox" aria-label="Scout suggestions" className="absolute top-full left-0 right-0 z-[60] mt-1 max-h-60 overflow-y-auto rounded-lg border border-white/15 bg-[#0c121a] p-1 shadow-2xl">
                {searching ? <div role="status" className="flex items-center gap-3 p-3 text-xs"><span className="scout-eye-ball"><Eye size={17}/></span>Scouting matching players…</div> : searchFailed ? <p role="alert" className="p-3 text-xs">Search unavailable. Please try again.</p> : <>
                  {searchQuery.trim().length >= 3 && <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => void askScout()} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-white/5">Ask Scout AI: “{searchQuery}”<small className="block text-[10px] text-slate-500">Natural-language answer from warehouse evidence · Enter</small></button>}
                  <p className="px-2 py-1 text-[10px] text-slate-500">{searchQuery ? 'Matching players in the database' : 'Players matching your current filters'}</p>
                  {discoveryResults.slice(0,3).map((player,index) => <div key={player.cricsheet_id} className="flex items-center"><button type="button" role="option" aria-selected={index === highlightedSuggestion} key={player.cricsheet_id} onMouseDown={e => e.preventDefault()} onClick={() => selectResult(player)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${index === highlightedSuggestion ? 'bg-white/10' : 'hover:bg-white/5'}`}><span>{player.name}<small className="block text-[10px] text-slate-500">{player.role?.label} · {player.competition.toUpperCase()}</small></span><ArrowRight size={14}/></button><button type="button" aria-label={`${isShortlisted(player.cricsheet_id) ? 'Remove' : 'Shortlist'} ${player.name}`} onMouseDown={e => e.preventDefault()} onClick={() => saveTarget(player.cricsheet_id)} className="px-2 text-slate-400 hover:text-white">{isShortlisted(player.cricsheet_id) ? <BookmarkCheck size={15}/> : <Bookmark size={15}/>}</button></div>)}
                  {searchQuery && !discoveryResults.length && <p className="p-3 text-xs text-slate-400">No players match these filters. Try another name or relax the requirements.</p>}
                </>}
              </div>}

              <div 
                className="w-full flex items-center bg-[#071018] border rounded-full px-3.5 py-1.5 transition-all duration-300 shadow-xl"
                style={{
                  borderColor: searchQuery ? accentColor : `${accentColor}44`,
                  boxShadow: searchQuery ? `0 0 18px ${glowColor}` : `0 4px 16px rgba(0,0,0,0.5), 0 0 8px ${glowColor}`,
                }}
              >
                <Search 
                  className="w-4 h-4 shrink-0 transition-colors" 
                  style={{ color: accentColor }} 
                />
                <input
                  type="text"
                  value={searchQuery}
                  role="combobox" aria-label="Search players" aria-expanded={suggestionsOpen} aria-controls="scout-search-results" aria-autocomplete="list"
                  onFocus={() => setSuggestionsOpen(true)}
                  onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
                  onKeyDown={event => {
                    if (event.key === 'Escape') setSuggestionsOpen(false);
                    if (event.key === 'ArrowDown') { event.preventDefault(); setSuggestionsOpen(true); setHighlightedSuggestion(i => Math.min(i + 1, Math.min(discoveryResults.length, 3) - 1)); }
                    if (event.key === 'ArrowUp') { event.preventDefault(); setHighlightedSuggestion(i => Math.max(0, i - 1)); }
                    if (event.key === 'Enter') { event.preventDefault(); void askScout(); }
                  }}
                  onChange={(e) => { setSearchQuery(e.target.value); setSuggestionsOpen(true); setHighlightedSuggestion(0); }}
                  placeholder={`What kind of player are you looking for${theme ? ` for ${theme.shortName}` : ""}?`}
                  className="w-full bg-transparent border-0 px-2.5 py-1 text-xs text-[#EFF5F7] placeholder-[#5A6D7B] focus:outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => void askScout()}
                  disabled={analystBusy || searchQuery.trim().length < 3}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md cursor-pointer"
                  style={{ 
                    backgroundColor: accentColor, 
                    color: "#050B11",
                    boxShadow: `0 0 10px ${glowColor}`,
                  }}
                  title="Execute talent intelligence query"
                >
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Filter Dropdown Pills Row */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              {/* Role Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen((v) => !v)}
                  className="flex items-center gap-1 bg-[#09141D] hover:bg-[#0F1E2B] border border-[#1C2E3C] px-2.5 py-1 rounded-lg text-[#A6B8C4] transition-all cursor-pointer"
                >
                  <span className="text-[10px]">👤</span>
                  <span>{role ? role.replace("_", " ") : "Role"}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-[#5D6F7C]" />
                </button>
                {roleDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-44 bg-[#0A141E] border border-[#1C2E3C] rounded-xl shadow-2xl p-1 z-50 space-y-0.5">
                    <button 
                      onClick={() => { setRole(""); setRoleDropdownOpen(false); }} 
                      className="w-full text-left px-2 py-1 rounded text-xs hover:bg-white/5"
                    >
                      All Roles
                    </button>
                    {["opener", "top_order", "middle_order", "finisher", "death_specialist", "powerplay_specialist"].map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setRole(r);
                          setDiscipline(r.includes("specialist") ? "bowling" : "batting");
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-xs capitalize ${
                          role === r ? "bg-white/10 text-white font-bold" : "text-[#8E9FA9] hover:bg-white/5"
                        }`}
                      >
                        {r.replace("_", " ")}
                      </button>
                    ))}
                  </div>

                )}
              </div>

              {/* Country Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCountryDropdownOpen((v) => !v)}
                  className="flex items-center gap-1 bg-[#09141D] hover:bg-[#0F1E2B] border border-[#1C2E3C] px-2.5 py-1 rounded-lg text-[#A6B8C4] transition-all cursor-pointer"
                >
                  <span className="text-[10px]">🌐</span>
                  <span>{selectedCountry === "All" ? "Country" : selectedCountry}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-[#5D6F7C]" />
                </button>
                {countryDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-32 bg-[#0A141E] border border-[#1C2E3C] rounded-xl shadow-2xl p-1 z-50 space-y-0.5">
                    {["All", "India", "Australia", "South Africa", "West Indies", "Overseas"].map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setSelectedCountry(c);
                          setCountryDropdownOpen(false);
                          if (c === "India") setSelectedComps(["ipl", "smat"]);
                          else if (c === "Australia") setSelectedComps(["bbl"]);
                          else if (c === "South Africa") setSelectedComps(["sa20"]);
                          else if (c === "West Indies") setSelectedComps(["cpl"]);
                          else setSelectedComps([]);
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-xs ${
                          selectedCountry === c ? "bg-white/10 text-white font-bold" : "text-[#8E9FA9] hover:bg-white/5"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                )}
              </div>

              {/* Age Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAgeDropdownOpen((v) => !v)}
                  className="flex items-center gap-1 bg-[#09141D] hover:bg-[#0F1E2B] border border-[#1C2E3C] px-2.5 py-1 rounded-lg text-[#A6B8C4] transition-all cursor-pointer"
                >
                  <span className="text-[10px]">🎂</span>
                  <span>{selectedAge === "All" ? "Age" : selectedAge}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-[#5D6F7C]" />
                </button>
                {ageDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-28 bg-[#0A141E] border border-[#1C2E3C] rounded-xl shadow-2xl p-1 z-50 space-y-0.5">
                    {["All", "< 23", "23–26", "27–30", "31+"].map((a) => (
                      <button
                        key={a}
                        onClick={() => {
                          setSelectedAge(a);
                          setAgeDropdownOpen(false);
                          if (a === "< 23") setMinBalls(60);
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-xs ${
                          selectedAge === a ? "bg-white/10 text-white font-bold" : "text-[#8E9FA9] hover:bg-white/5"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>

                )}
              </div>

              {/* League Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLeagueDropdownOpen((v) => !v)}
                  className="flex items-center gap-1 bg-[#09141D] hover:bg-[#0F1E2B] border border-[#1C2E3C] px-2.5 py-1 rounded-lg text-[#A6B8C4] transition-all cursor-pointer"
                >
                  <span className="text-[10px]">⭕</span>
                  <span>
                    {selectedComps.length === 0 
                      ? "League" 
                      : selectedComps.length === 1 
                        ? selectedComps[0].toUpperCase() 
                        : `${selectedComps.length} Leagues`}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 text-[#5D6F7C]" />
                </button>
                {leagueDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-[#0A141E] border border-[#1C2E3C] rounded-xl shadow-2xl p-1 z-50 space-y-0.5">
                    <button
                      onClick={() => {
                        setSelectedComps([]);
                        setLeagueDropdownOpen(false);
                      }}
                      className="w-full text-left px-2 py-1 rounded text-xs text-[#8E9FA9] hover:bg-white/5"
                    >
                      All 6 Leagues
                    </button>
                    {SCOUT_LEAGUES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => toggleLeague(l.code)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs ${
                          selectedComps.includes(l.code)
                            ? "bg-white/10 text-white font-bold"
                            : "text-[#8E9FA9] hover:bg-white/5"
                        }`}
                      >
                        <span>{l.name}</span>
                        {selectedComps.includes(l.code) && <span style={{ color: accentColor }}>✓</span>}
                      </button>
                    ))}
                  </div>

                )}
              </div>

              {/* Sliders icon for volume threshold */}
              <button
                type="button"
                onClick={() => setMinBalls(minBalls === 120 ? 60 : 120)}
                className={`p-1 rounded-lg border transition-all cursor-pointer ${
                  minBalls !== 120 
                    ? "bg-white/10 border-[var(--scout-accent)] text-[var(--scout-accent)]" 
                    : "bg-[#09141D] border-[#1C2E3C] text-[#6E818F] hover:text-white"
                }`}
                title={`Sample threshold (${minBalls}b)`}
              >
                <SlidersHorizontal className="w-3 h-3" />
              </button>
            </div>

            {/* 4 Quick Action Prompt Cards with Increased Size to close gap with ALL LEAGUES box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {QUICK_CARDS.map((card) => (
                <div
                  key={card.title}
                  onClick={card.action}
                  className="group relative bg-white dark:bg-[#08121B] hover:bg-slate-50 dark:hover:bg-[#0C1A27] border rounded-2xl p-3 sm:p-3.5 flex flex-col justify-end h-36 sm:h-40 cursor-pointer transition-all duration-300 shadow-sm dark:shadow-xl hover:-translate-y-1 overflow-hidden"
                  style={{
                    borderColor: `${accentColor}33`,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = accentColor;
                    e.currentTarget.style.boxShadow = `0 12px 28px rgba(0,0,0,0.15), 0 0 16px ${glowColor}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${accentColor}33`;
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
                  }}
                >
                  <svg aria-hidden="true" viewBox="0 0 180 120" className="absolute inset-0 w-full h-full opacity-20 dark:opacity-40 group-hover:opacity-60 transition-opacity" fill="none" stroke={accentColor}><ellipse cx="90" cy="60" rx="76" ry="48"/><ellipse cx="90" cy="60" rx="52" ry="32" strokeDasharray="3 5"/><rect x="80" y="32" width="20" height="56" rx="2"/><path d="M78 40h24M78 80h24M90 10v15M90 95v15M10 60h20M150 60h20"/><circle cx="45" cy="40" r="4"/><circle cx="133" cy="77" r="4"/><path d="M45 40L90 60l43 17" strokeDasharray="4 4"/></svg>
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-[#060D15] dark:via-[#060D15]/80" />

                  <div className="relative z-10 space-y-1">
                    <span className="inline-block text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA3B2] group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {card.sub}
                    </span>
                    <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-[var(--scout-accent)] transition-colors leading-tight">
                      {card.title}
                    </p>
                    <div 
                      className="w-4 h-0.5 rounded-full transition-all duration-300 group-hover:w-8"
                      style={{ backgroundColor: accentColor }}
                    />
                  </div>

                </div>

              ))}
            </div>
          </div>

          {/* ── CENTER COLUMN (4 cols): 3D Holographic Globe & Network Connections ── */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center relative min-h-[300px]">
            <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
              {/* Outer atmospheric aura */}
              <div 
                className="absolute inset-4 rounded-full blur-2xl opacity-20 pointer-events-none"
                style={{ backgroundColor: accentColor }}
              />

              <svg 
                viewBox="0 0 300 300" 
                className="w-full h-full relative z-10 overflow-visible"
              >
                <defs>
                  <filter id="franchiseGlobeTint"><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncR type="linear" slope="1" /><feFuncG type="linear" slope="1" /><feFuncB type="linear" slope="1" /></feComponentTransfer><feFlood floodColor={accentColor} result="tint" /><feComposite in="tint" in2="SourceGraphic" operator="in" /><feBlend in2="SourceGraphic" mode="multiply" /></filter><radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0B1A28" stopOpacity="0.9" />
                    <stop offset="70%" stopColor="#07121D" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#03080E" stopOpacity="1" />
                  </radialGradient>
                  
                  <filter id="neonFilter" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="glow" />
                    <feComposite in="SourceGraphic" in2="glow" operator="over" />
                  </filter>
                </defs>

                {/* Sphere background & authentic 3D illuminated texture */}
                <clipPath id="globeClip">
                  <circle cx="150" cy="150" r="109" />
                </clipPath>
                <circle cx="150" cy="150" r="110" fill="url(#globeGlow)" stroke="#16293A" strokeWidth="1.5" />

                {/* Spinning 3D Globe Texture & Grid Lines */}
                <g clipPath="url(#globeClip)">
                  <g className="scout-globe-spinning" style={{ transformOrigin: "150px 150px" }}>
                    <image
                      href="/scout-globe.jpg"
                      x="25"
                      y="25"
                      width="250"
                      height="250"
                      preserveAspectRatio="xMidYMid slice"
                      className="opacity-75 mix-blend-screen pointer-events-none" filter="url(#franchiseGlobeTint)"
                    />
                    {/* Meridians & Parallels (Spinning with globe) */}
                    <ellipse cx="150" cy="150" rx="35" ry="110" fill="none" stroke="#163045" strokeWidth="0.8" opacity="0.6" />
                    <ellipse cx="150" cy="150" rx="75" ry="110" fill="none" stroke="#163045" strokeWidth="0.8" opacity="0.6" />
                    <line x1="150" y1="40" x2="150" y2="260" stroke="#1C3D58" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.7" />
                    <ellipse cx="150" cy="95" rx="90" ry="25" fill="none" stroke="#163045" strokeWidth="0.8" opacity="0.6" />
                    <ellipse cx="150" cy="150" rx="110" ry="30" fill="none" stroke="#1C3D58" strokeWidth="1" opacity="0.7" />
                    <ellipse cx="150" cy="205" rx="90" ry="25" fill="none" stroke="#163045" strokeWidth="0.8" opacity="0.6" />
                  </g>
                </g>

                {/* Counter-rotating orbital radar trajectory ring */}
                <circle
                  cx="150"
                  cy="150"
                  r="126"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="0.9"
                  strokeDasharray="4 8"
                  className="scout-globe-orbit opacity-40 pointer-events-none"
                  style={{ transformOrigin: "150px 150px" }}
                />

                {/* Animated Curved Connection Arcs Between League Hubs */}
                <g filter="url(#neonFilter)">
                  {/* India (IPL) -> Australia (BBL) */}
                  <path
                    d="M 180 115 Q 220 160 215 200"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    className="opacity-75"
                  />
                  {/* India (IPL) -> South Africa (SA20) */}
                  <path
                    d="M 180 115 Q 160 180 135 220"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    className="opacity-75"
                  />
                  {/* India (IPL) -> Caribbean (CPL) */}
                  <path
                    d="M 180 115 Q 130 90 90 140"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    className="opacity-75"
                  />
                  {/* India (IPL) -> UAE (ILT20) */}
                  <path
                    d="M 180 115 Q 165 125 155 125"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    className="opacity-80"
                  />
                </g>

                {/* Six Interactive League Nodes Placed on Globe */}
                {/* 1. IPL (India) */}
                <g className="cursor-pointer group/node" onClick={() => toggleLeague("ipl")}>
                  <circle cx="180" cy="115" r="11" fill={selectedComps.includes("ipl") ? accentColor : "#0B1A28"} stroke={accentColor} strokeWidth="2" />
                  <circle cx="180" cy="115" r="4.5" fill={selectedComps.includes("ipl") ? "#050B11" : accentColor} />
                  <text x="194" y="112" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">IPL</text>
                  <text x="194" y="121" fill="#7E909D" fontSize="6.5" fontFamily="sans-serif">INDIA</text>
                </g>

                {/* 2. SMAT (India) */}
                <g className="cursor-pointer group/node" onClick={() => toggleLeague("smat")}>
                  <circle cx="210" cy="98" r="9" fill={selectedComps.includes("smat") ? accentColor : "#0B1A28"} stroke={accentColor} strokeWidth="1.5" />
                  <circle cx="210" cy="98" r="3.5" fill={selectedComps.includes("smat") ? "#050B11" : accentColor} />
                  <text x="223" y="96" fill="#FFFFFF" fontSize="8.5" fontFamily="monospace" fontWeight="bold">SMAT</text>
                  <text x="223" y="104" fill="#7E909D" fontSize="6.5" fontFamily="sans-serif">INDIA</text>
                </g>

                {/* 3. BBL (Australia) */}
                <g className="cursor-pointer group/node" onClick={() => toggleLeague("bbl")}>
                  <circle cx="215" cy="200" r="11" fill={selectedComps.includes("bbl") ? accentColor : "#0B1A28"} stroke={accentColor} strokeWidth="2" />
                  <circle cx="215" cy="200" r="4.5" fill={selectedComps.includes("bbl") ? "#050B11" : accentColor} />
                  <text x="230" y="198" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">BBL</text>
                  <text x="230" y="207" fill="#7E909D" fontSize="6.5" fontFamily="sans-serif">AUSTRALIA</text>
                </g>

                {/* 4. SA20 (South Africa) */}
                <g className="cursor-pointer group/node" onClick={() => toggleLeague("sa20")}>
                  <circle cx="135" cy="220" r="11" fill={selectedComps.includes("sa20") ? accentColor : "#0B1A28"} stroke={accentColor} strokeWidth="2" />
                  <circle cx="135" cy="220" r="4.5" fill={selectedComps.includes("sa20") ? "#050B11" : accentColor} />
                  <text x="150" y="218" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">SA20</text>
                  <text x="150" y="227" fill="#7E909D" fontSize="6.5" fontFamily="sans-serif">SOUTH AFRICA</text>
                </g>

                {/* 5. CPL (Caribbean) */}
                <g className="cursor-pointer group/node" onClick={() => toggleLeague("cpl")}>
                  <circle cx="90" cy="140" r="10" fill={selectedComps.includes("cpl") ? accentColor : "#0B1A28"} stroke={accentColor} strokeWidth="1.5" />
                  <circle cx="90" cy="140" r="4" fill={selectedComps.includes("cpl") ? "#050B11" : accentColor} />
                  <text x="56" y="138" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">CPL</text>
                  <text x="42" y="147" fill="#7E909D" fontSize="6.5" fontFamily="sans-serif">CARIBBEAN</text>
                </g>

                {/* 6. ILT20 (UAE) */}
                <g className="cursor-pointer group/node" onClick={() => toggleLeague("ilt20")}>
                  <circle cx="155" cy="125" r="9" fill={selectedComps.includes("ilt20") ? accentColor : "#0B1A28"} stroke={accentColor} strokeWidth="1.5" />
                  <circle cx="155" cy="125" r="3.5" fill={selectedComps.includes("ilt20") ? "#050B11" : accentColor} />
                  <text x="115" y="122" fill="#FFFFFF" fontSize="8.5" fontFamily="monospace" fontWeight="bold">ILT20</text>
                  <text x="129" y="130" fill="#7E909D" fontSize="6.5" fontFamily="sans-serif">UAE</text>
                </g>
              </svg>
            </div>
          </div>

          {/* ── RIGHT COLUMN (3 cols): Scouting Network Status HUD & Pinned Note ── */}
          <div className="lg:col-span-3 space-y-3">
            
            {/* Top HUD Card: SCOUTING NETWORK */}
            <div className="bg-white/90 dark:bg-[#060F17]/90 border border-slate-200 dark:border-[#162734] rounded-xl p-3 shadow-md dark:shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-700 dark:text-[#A8BCC9] pb-2 border-b border-slate-200 dark:border-[#132330]">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: accentColor }}>›</span>
                  <span className="tracking-wider uppercase">SCOUTING NETWORK</span>
                </div>

                <span className="text-[9px] text-slate-500 dark:text-[#556775]">6 CONNECTED</span>
              </div>

              <div className="space-y-1.5 pt-2">
                {SCOUT_LEAGUES.map((league) => {
                  const isActive = selectedComps.length === 0 || selectedComps.includes(league.code);
                  return (
                    <button
                      key={league.code}
                      onClick={() => toggleLeague(league.code)}
                      className="w-full flex items-center justify-between text-[11px] font-mono py-0.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-1.5 h-1.5 rounded-full transition-all"
                          style={{
                            backgroundColor: isActive ? accentColor : "#94A3B8",
                            boxShadow: isActive ? `0 0 6px ${accentColor}` : "none",
                          }}
                        />
                        <span className={isActive ? "text-slate-900 dark:text-white font-bold" : "text-slate-500 dark:text-[#758694]"}>
                          {league.name}
                        </span>
                      </div>

                      <span 
                        className="text-[9px] font-semibold"
                        style={{ color: isActive ? accentColor : "#94A3B8" }}
                      >
                        {isActive ? "Connected" : "Standby"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pinned Note on Cork/Cardboard with Red Pushpin */}
            <div className="relative group rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-red-600 border border-red-300 shadow-md z-20 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-white/70" />
              </div>

              <div className="bg-[#D9D1BF] text-[#1E2A30] rounded-lg p-3 shadow-xl border border-[#B5AB94] space-y-0.5 font-serif">
                <p className="font-bold text-xs tracking-tight text-[#16242C] leading-tight">
                  Right Player
                </p>
                <p className="font-bold text-xs tracking-tight text-[#16242C] leading-tight">
                  Right Role
                </p>
                <p className="font-bold text-xs tracking-tight text-[#16242C] leading-tight">
                  Stronger Squad
                </p>
              </div>
            </div>

            {/* Bottom HUD Card: RECENT SEARCHES */}
            <div className="bg-white/90 dark:bg-[#060F17]/90 border border-slate-200 dark:border-[#162734] rounded-xl p-3 shadow-md dark:shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-700 dark:text-[#A8BCC9] pb-1.5 border-b border-slate-200 dark:border-[#132330]">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: accentColor }}>›</span>
                  <span className="tracking-wider uppercase">RECENT SEARCHES</span>
                </div>

                <ChevronDown className="w-3 h-3 text-slate-400 dark:text-[#556775] -rotate-90" />
              </div>

              <div className="space-y-1 pt-1.5 text-[11px] font-mono text-slate-600 dark:text-[#8295A2]">
                {RECENT_SEARCHES.map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full text-left py-0.5 px-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors truncate cursor-pointer flex items-center gap-1.5 group"
                  >
                    <span 
                      className="w-1 h-1 rounded-full group-hover:scale-125 transition-transform" 
                      style={{ backgroundColor: accentColor }} 
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── 3. TACTICAL SCOUT DESK (LOWER HALF OF ROOM) ── */}
        <div className="mt-6 pt-5 border-t border-[#12202C] relative">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end relative z-10">
            
            {/* ── LEFT DESK: Stenciled Binder & Radar with Seam-Stitched Red Ball (3 cols) ── */}
            <div className="lg:col-span-3 flex flex-col items-center sm:items-start space-y-3">
              <div 
                className="w-full bg-[#141210] border-2 rounded-2xl p-3.5 shadow-2xl relative overflow-hidden transition-all duration-300"
                style={{ borderColor: `${accentColor}33` }}
              >
                <div className="flex items-center justify-between border-b border-[#2C2620] pb-1.5">
                  <span className="font-display font-black text-xs tracking-widest text-[#B5A48F] uppercase">
                    ALL LEAGUES
                  </span>
                  <div className="flex items-center gap-1">
                    <Coffee className="w-3 h-3 text-[#B5A48F]" />
                    <span className="text-[8px] font-mono text-[#7D7062]">CRICFIELD</span>
                  </div>

                </div>


                <div className="grid grid-cols-3 gap-1 pt-2 font-mono text-[9px] text-center font-bold">
                  {SCOUT_LEAGUES.map((l) => (
                    <div 
                      key={l.code}
                      onClick={() => toggleLeague(l.code)}
                      className={`p-1 rounded border transition-colors cursor-pointer ${
                        selectedComps.includes(l.code)
                          ? "bg-[var(--scout-accent)] text-[#050B11] border-[var(--scout-accent)]"
                          : "bg-[#1E1A16] border-[#2E2820] text-[#9E8F7F] hover:text-white"
                      }`}
                    >
                      {l.badge}
                    </div>

                  ))}
                </div>


                {/* Radar Sweep Circle with Red Textured Cricket Ball */}
                <div className="mt-3 pt-1 flex flex-col items-center justify-center relative">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    {/* Concentric radar rings */}
                    <div 
                      className="absolute inset-0 rounded-full border border-dashed opacity-40 animate-spin" 
                      style={{ borderColor: accentColor, animationDuration: "20s" }}
                    />
                    <div 
                      className="absolute inset-3 rounded-full border opacity-50"
                      style={{ borderColor: accentColor }}
                    />
                    <div 
                      className="absolute inset-6 rounded-full border opacity-60"
                      style={{ borderColor: accentColor }}
                    />
                    
                    {/* Radar Sweep Line */}
                    <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                      <div 
                        className="w-1/2 h-1/2 origin-bottom-right animate-spin"
                        style={{
                          background: `conic-gradient(from 0deg at 100% 100%, transparent 60deg, ${glowColor} 0deg)`,
                          animationDuration: "4s",
                          animationTimingFunction: "linear",
                        }}
                      />
                    </div>


                    {/* 3D Red Cricket Ball in Center */}
                    <div 
                      className="relative z-10 w-12 h-12 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                      style={{
                        background: "radial-gradient(circle at 35% 35%, #DC2626 0%, #991B1B 50%, #450A0A 100%)",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.4)",
                      }}
                      title="Global Ball Telemetry"
                    >
                      <svg viewBox="0 0 64 64" className="w-full h-full absolute inset-0 pointer-events-none">
                        <path 
                          d="M 12 12 Q 32 32 52 52" 
                          fill="none" 
                          stroke="#F8FAFC" 
                          strokeWidth="1.2" 
                          strokeDasharray="2 1.5" 
                        />
                      </svg>
                      <div className="absolute top-1.5 left-2 w-2 h-1.5 rounded-full bg-white/40 blur-[1px]" />
                    </div>

                  </div>

                </div>

              </div>
            </div>

            {/* ── CENTER DESK: The Master Scout Dossier Clipboard (6 cols) ── */}
            <div className="lg:col-span-6">
              <div 
                className="bg-[#0A131C] border-2 rounded-2xl p-4 sm:p-5 shadow-2xl relative transition-all duration-300"
                style={{
                  borderColor: isDossierShortlisted ? accentColor : `${accentColor}44`,
                  boxShadow: `0 16px 40px rgba(0,0,0,0.6), 0 0 24px ${glowColor}`,
                }}
              >
                <div className="mb-4 flex gap-2" role="group" aria-label="Scout views">
                  <button type="button" aria-pressed={activeTab === 'search'} onClick={() => { setActiveTab('search'); onSelectPlayer(null); }} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Scout Room Search</button>
                  <button type="button" aria-pressed={activeTab === 'shortlist'} onClick={() => { setActiveTab(activeTab === 'shortlist' ? 'search' : 'shortlist'); onSelectPlayer(null); }} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Shortlisted Targets ({shortlist.length})</button>
                </div>

                {activeTab === 'shortlist' ? <section aria-label="Shortlisted targets" className="space-y-2">
                  {shortlist.length ? shortlist.map(player => <div key={player.cricsheet_id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"><div><Link href={`/scout/player/${player.cricsheet_id}`} className="text-sm font-bold">{player.name}</Link><button type="button" className="mt-1 block text-[10px] underline" onClick={() => setEvaluatedTargetId(player.cricsheet_id)}>Inspect recruitment fit</button><p className="mt-1 text-xs text-slate-400">{player.role?.label} · {player.competition.toUpperCase()}</p></div><button type="button" className="text-xs text-slate-400 hover:text-white" onClick={() => onToggleShortlist(player.cricsheet_id)}>Remove target</button></div>) : <p className="p-4 text-xs text-slate-400">No targets yet. Shortlist players from search to build your squad.</p>}
                </section> : !selectedPlayer || isShortlisted(selectedPlayer.cricsheet_id) ? <p className="p-4 text-xs text-slate-400">Search for a player above, or open Shortlisted Targets to review saved players.</p> : <>
                <div id="scout-selected-player" className="scroll-mt-20" />
                {selectedPlayer && <div className="mb-3 rounded-lg border border-white/10 bg-[#0b1118] p-3 text-xs">
                  <p className="mb-2 font-bold">Recruitment fit · {theme?.shortName ?? 'All teams'}</p>
                  {[['Discipline', selectedPlayer.discipline === discipline], ['Role', !role || selectedPlayer.role?.label?.toLowerCase().replaceAll(' ', '_').includes(role)], ['Phase', phase === 'all' || selectedPlayer.phase === phase], ['League', !selectedComps.length || selectedComps.includes(selectedPlayer.competition)], ['Minimum sample', selectedPlayer.balls >= minBalls]].map(([label, matched]) => <p key={String(label)} className="flex justify-between py-1 text-slate-400"><span>{String(label)}</span><span>{matched ? '✓ Matched' : 'Not matched'}</span></p>)}
                  <p className="mt-2 text-[10px] text-slate-500">Age, handedness, nationality, uncapped status and auction availability require verification.</p>
                  <div className="mt-3 flex flex-wrap gap-3"><Link href={`/scout/player/${selectedPlayer.cricsheet_id}`}>Player report ↗</Link><Link href={`/ai-analyst/squad-dna?team=${selectedTeam ?? 'RCB'}`}>Team requirements ↗</Link><Link href={`/ai-analyst/auction-war-room?team=${selectedTeam ?? ''}&q=${encodeURIComponent(selectedPlayer.name)}`}>IPL 2027 recruitment ↗</Link></div>
                </div>
}
                {/* Dossier Header: Avatar + Specs + SHORTLIST Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#162634]">
                  <div className="flex items-center gap-3">
                    {/* Player photo / avatar */}
                    <div 
                      className="w-14 h-14 rounded-xl overflow-hidden border-2 flex items-center justify-center font-display font-black text-base bg-[#050C14] shrink-0 shadow-md"
                      style={{ borderColor: accentColor }}
                    >
                      {activeDossier.photo ? (
                        <img 
                          src={activeDossier.photo} 
                          alt={activeDossier.name} 
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/arjun-menon.jpg";
                          }}
                        />
                      ) : (
                        <span style={{ color: accentColor }}>{activeDossier.name.slice(0, 2)}</span>
                      )}
                    </div>


                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-black text-lg text-white tracking-wide">
                          {activeDossier.name}
                        </h3>
                        <span className="text-sm">{activeDossier.flag}</span>
                      </div>

                      <p className="text-[11px] text-[#9BB0BF] font-medium leading-none">
                        {activeDossier.roleSpec}
                      </p>
                      <p className="text-[10px] font-mono text-[#627685]">
                        {activeDossier.meta}
                      </p>
                    </div>

                  </div>


                  {/* Stamped SHORTLIST outline badge */}
                  <button
                    type="button"
                    onClick={() => selectedPlayer && saveTarget(selectedPlayer.cricsheet_id)}
                    className="self-start sm:self-center px-3 py-1.5 rounded-lg border-2 font-mono font-black text-[11px] tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5"
                    style={{
                      borderColor: accentColor,
                      backgroundColor: isDossierShortlisted ? accentColor : "transparent",
                      color: isDossierShortlisted ? "#050B11" : accentColor,
                      boxShadow: isDossierShortlisted ? `0 0 14px ${glowColor}` : "none",
                    }}
                    title="Toggle player in your active shortlist"
                  >
                    {isDossierShortlisted ? (
                      <BookmarkCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                    <span>{isDossierShortlisted ? "SHORTLISTED" : "SHORTLIST"}</span>
                  </button>
                </div>


                {/* Two Columns: STRENGTHS vs WHY CONSIDER? */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-b border-[#162634] text-[11px]">
                  {/* Strengths */}
                  <div className="space-y-1">
                    <span 
                      className="font-mono font-bold uppercase tracking-wider text-[10px]"
                      style={{ color: accentColor }}
                    >
                      STRENGTHS
                    </span>
                    <ul className="space-y-1 text-[#C4D5E0]">
                      {activeDossier.strengths.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span style={{ color: accentColor }} className="font-bold">›</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>


                  {/* Why Consider? */}
                  <div className="space-y-1">
                    <span 
                      className="font-mono font-bold uppercase tracking-wider text-[10px]"
                      style={{ color: accentColor }}
                    >
                      WHY CONSIDER?
                    </span>
                    <p className="text-[#8FA2B0] leading-relaxed">
                      {activeDossier.whyConsider}
                    </p>
                  </div>

                </div>


                {/* Bottom Telemetry & View Player File */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
                  <div className="flex items-center gap-4 font-mono">
                    <div>
                      <span className="block text-[9px] text-[#627685] uppercase">SR (16-20)</span>
                      <strong className="text-base font-bold text-white tracking-tight">
                        {activeDossier.srDeath}
                      </strong>
                    </div>


                    <div className="h-6 w-px bg-[#162634]" />

                    <div>
                      <span className="block text-[9px] text-[#627685] uppercase">Avg (T20)</span>
                      <strong className="text-base font-bold text-white tracking-tight">
                        {activeDossier.avgT20}
                      </strong>
                    </div>


                    <div className="h-6 w-px bg-[#162634]" />

                    <div>
                      <span className="block text-[9px] text-[#627685] uppercase">Recent Form</span>
                      <div className="flex items-end gap-1 h-4 pt-0.5">
                        {activeDossier.recentForm.map((val, idx) => (
                          <div
                            key={idx}
                            className="w-1.5 rounded-t transition-all"
                            style={{
                              height: `${(val / 100) * 14}px`,
                              backgroundColor: accentColor,
                              boxShadow: `0 0 4px ${accentColor}`,
                            }}
                          />
                        ))}
                      </div>

                    </div>

                  </div>


                  {/* View Player File Action */}
                  <Link 
                    href={`/scout/player/${activeDossier.cricsheet_id}`}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-[11px] transition-all hover:brightness-110 cursor-pointer"
                    style={{
                      borderColor: "rgba(255,255,255,0.15)",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      color: "#FFFFFF",
                    }}
                  >
                    <span>View Player File</span>
                    <ArrowRight className="w-3 h-3" style={{ color: accentColor }} />
                  </Link>
                </div>

                </>}
              </div>
            </div>

            {/* ── RIGHT DESK: Wirebound Notepad with Interactive Checklist (3 cols) ── */}
            <div className="lg:col-span-3 space-y-3">
              <div className="bg-[#0E1721] border border-[#1A2A38] rounded-xl p-3 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#182634] pb-1.5 text-[9px] font-mono text-[#7D8F9C]">
                  <span>RECRUITMENT REQUIREMENTS</span>
                  <span>CHECKLIST</span>
                </div>


                <div className="flex flex-wrap gap-3 pt-3 text-[10px] text-slate-400"><Link href={`/ai-analyst/squad-dna?team=${selectedTeam ?? 'RCB'}`} className="hover:text-white underline">Review team needs ↗</Link><Link href={`/ai-analyst/auction-war-room?team=${selectedTeam ?? ''}`} className="hover:text-white underline">Recruitment board ↗</Link></div>
                <div className="pt-3 text-xs" aria-live="polite">
                  {evaluation ? <><p className="font-bold" style={{ color: accentColor }}>SRH custom fit · {evaluation.suitabilityScore.toFixed(1)}/10</p><p className="mt-1 text-[10px] text-slate-500">{evaluation.complete ? 'All criteria have evidence.' : `Confirmed points; possible range ${evaluation.suitabilityScore.toFixed(1)}–${evaluation.maximumPossible.toFixed(1)}. Missing attributes remain unknown.`}</p></> : <p className="text-slate-500">Shortlist a player to inspect their fit.</p>}
                  <p className="mt-2 text-[9px] text-slate-500">Custom SRH blueprint: power 2 · left-arm 1.5 · death bowling 2 · uncapped 1 · overseas 1.5 · finisher 2. Not an official recruitment rating.</p>
                </div>

                <div className="space-y-1.5 pt-2 text-[11px] font-mono">
                  {[
                    { key: "powerHitter", label: "Power Hitter ?" },
                    { key: "leftArmOption", label: "Left arm option ?" },
                    { key: "deathBowler", label: "Death Bowler ?" },
                    { key: "uncapped", label: "Uncapped ?" },
                    { key: "overseasSlot", label: "Overseas slot ?" },
                    { key: "finisher", label: "Finisher ?" },
                  ].map((item) => {
                    const capability = evaluation?.checks[item.key as keyof ReturnType<typeof evaluateSRHSuitability>['checks']];
                    const status = evaluation ? capability === true ? "Covered ✓" : capability === false ? "Needed" : "Unknown" : "Needed";
                    const checked = status === "Covered ✓";
                    return (
                      <div
                        key={item.key}
                        className="w-full flex items-center justify-between py-1 px-1 rounded hover:bg-white/5 transition-colors cursor-pointer text-left"
                      >
                        <span className={checked ? "text-white font-medium" : "text-[#677A87]"}>
                          {item.label}
                        </span>
                        {checked ? (
                          <CheckSquare 
                            className="w-3.5 h-3.5 shrink-0 transition-colors" 
                            style={{ color: accentColor }} 
                          />
                        ) : (
                          <Square className="w-3.5 h-3.5 shrink-0 text-[#40505D]" />
                        )}
                        <span className="text-[9px] text-slate-400">{status}</span>
                      </div>

                    );
                  })}
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
