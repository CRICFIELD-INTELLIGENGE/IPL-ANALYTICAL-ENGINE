import React, { useState, useEffect, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { useTeamTheme, TEAM_REGISTRY, type TeamCode } from "@/lib/team-context";
import { 
  Shield, Trophy, Sparkles, TrendingUp, Gavel, BarChart2,
  Users, Activity, ArrowRight, CheckCircle2, ChevronRight,
  Flame, HelpCircle, Layers, Swords, MessageSquare, Award, Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BroadcasterLink } from "@/components/broadcaster-link";
import { getFranchiseCelebratedHighlight } from "@/lib/broadcaster-registry";
import { AdVessel } from "@/components/ad-vessel";
import { VideoShelf } from "@/components/video-shelf";
import { VideoArchiveModal } from "@/components/video-archive-modal";
import { getVideosByTeam } from "@/lib/video-registry";
import { ExternalLink } from "lucide-react";

// FRANCHISE HISTORICAL MILESTONES DATA
const FRANCHISE_JOURNEYS: Record<TeamCode, Array<{ era: string; year: string; title: string; highlight: string; outcome: string; badge: string; milestoneKey?: string }>> = {
  RCB: [
    { era: "Inception Era", year: "2008–2010", title: "Early Foundation & Kumble Final Run", highlight: "Rebuilt squad around Anil Kumble's captaincy leading to the 2009 Johannesburg final run.", outcome: "Runners-Up 2009", badge: "FOUNDATION" },
    { era: "The Gayle-Kohli-AB Storm", year: "2011–2016", title: "Record 263/5 & Historic 2016 Campaign", highlight: "Virat Kohli's historic 973-run season with 4 centuries, carrying RCB to the epic 2016 Chinnaswamy final.", outcome: "Runners-Up 2016", badge: "PEAK VIOLENCE", milestoneKey: "RCB_2016" },
    { era: "Bowling Rebuild", year: "2020–2024", title: "Playoffs Consistency & Siraj-Chahal Axis", highlight: "Qualifying for playoffs 4 seasons out of 5 with death-overs discipline and elite spin economy.", outcome: "Playoffs Regulars", badge: "BALANCE" },
    { era: "Championship Glory", year: "2026", title: "Maiden TATA IPL Title Triumph", highlight: "11 wins - 4 losses campaign. Kohli leads run-scoring with 741 runs, sealing the elusive first trophy.", outcome: "CHAMPIONS 2026 ★", badge: "MAIDEN TITLE", milestoneKey: "RCB_2026" }
  ],
  CSK: [
    { era: "First Dynasty", year: "2010–2011", title: "Back-to-Back Championships", highlight: "Dhoni and Fleming establish the Chepauk spin stranglehold, winning back-to-back IPL titles.", outcome: "CHAMPIONS 2010, 2011 ★", badge: "DYNASTY" },
    { era: "The Fairytale Return", year: "2018", title: "The Dad's Army Miracle", highlight: "After two years away, Watson's final blitz seals an emotional fairytale third title for the yellow army.", outcome: "CHAMPIONS 2018 ★", badge: "FAIRYTALE", milestoneKey: "CSK_2018" },
    { era: "Title Number 4 & 5", year: "2021–2023", title: "Ahmedabad Rain Thriller & 5th Star", highlight: "Ravindra Jadeja strikes 10 runs off the final 2 balls at 1:35 AM to equal MI with 5 IPL titles.", outcome: "CHAMPIONS 2021, 2023 ★", badge: "RECORD 5 TITLES", milestoneKey: "CSK_2023" },
    { era: "Succession Era", year: "2024–2026", title: "Ruturaj Era & Strategic Succession", highlight: "Smooth captaincy transition to Gaikwad while preserving the core Dhoni tactical blueprint.", outcome: "Playoff Contenders", badge: "SUCCESSION" }
  ],
  MI: [
    { era: "The Breakthrough", year: "2013", title: "Rohit Takes the Armband", highlight: "Rohit Sharma named captain mid-season, defeating CSK at Eden Gardens to lift MI's first title.", outcome: "CHAMPIONS 2013 ★", badge: "FIRST STAR", milestoneKey: "MI_2013" },
    { era: "Odd-Year Juggernaut", year: "2015–2019", title: "Four Titles in Seven Years", highlight: "Bumrah, Malinga, Pollard, and the Pandya brothers dominate high-pressure playoff finals.", outcome: "CHAMPIONS 2015, 2017, 2019 ★", badge: "PRESSURE DOMINANCE", milestoneKey: "MI_2019" },
    { era: "Greatest T20 Team", year: "2020", title: "The Undisputed 2020 Campaign", highlight: "Clinical domination from match one to the final in Dubai, crowned five-time champions.", outcome: "CHAMPIONS 2020 ★", badge: "RECORD 5 TITLES", milestoneKey: "MI_2020" },
    { era: "Transition Matrix", year: "2024–2026", title: "Core Regeneration & Hardik Leadership", highlight: "Rebuilding the pace battery around Bumrah with emerging Indian domestic all-rounders.", outcome: "Rebuilding Core", badge: "NEW GENERATION" }
  ],
  KKR: [
    { era: "Gambhir Revolution", year: "2012–2014", title: "Two Titles Under Gautam Gambhir", highlight: "Sunil Narine mystery spin and aggressive top-order revolution yields two championships.", outcome: "CHAMPIONS 2012, 2014 ★", badge: "TWICE CHAMPIONS", milestoneKey: "KKR_2014" },
    { era: "The Boundary Engine", year: "2018–2023", title: "Andre Russell Era & High-Risk Cricket", highlight: "Pioneering ultra-high strike rate cricket and death overs blitzes across Indian venues.", outcome: "Runners-Up 2021", badge: "BOUNDARY POWER" },
    { era: "The 2024 Masterclass", year: "2024", title: "Narine-Salt Opening Rampage", highlight: "Unstoppable run-rate blitz through 2024 with Mitchell Starc's playoff masterclass lifting 3rd cup.", outcome: "CHAMPIONS 2024 ★", badge: "3RD STAR", milestoneKey: "KKR_2024" },
    { era: "Title Defense", year: "2025–2026", title: "Retaining All-Phase Dominance", highlight: "Preserving spin duo Narine-Varun while grooming young Indian domestic anchors.", outcome: "Top-4 Contenders", badge: "SPIN ARSENAL" }
  ],
  SRH: [
    { era: "Deccan Roots", year: "2009", title: "Gilchrist's South Africa Triumph", highlight: "Deccan Chargers roar from last place to tournament champions in South Africa.", outcome: "CHAMPIONS 2009 ★", badge: "FIRST TITLE" },
    { era: "Warner's Fortress", year: "2016", title: "Defending Low Totals & 2016 Win", highlight: "David Warner scores 848 runs, defending 208 against RCB at Chinnaswamy for the trophy.", outcome: "CHAMPIONS 2016 ★", badge: "CHAMPIONS 2016", milestoneKey: "RCB_2016" },
    { era: "Bowling Citadel", year: "2018", title: "Kane Williamson Final Run", highlight: "Rashid Khan and Bhuvneshwar Kumar choke oppositions under 140 regularly throughout 2018.", outcome: "Runners-Up 2018", badge: "BOWLING CITADEL", milestoneKey: "CSK_2018" },
    { era: "287/3 Boundary Revolution", year: "2024–2026", title: "Head-Abhishek Historic Scoring Spikes", highlight: "Shattered all-time IPL scoring records with 277 and 287/3 totals under Pat Cummins.", outcome: "Runners-Up 2024", badge: "WORLD RECORD" }
  ],
  RR: [
    { era: "Shane Warne Magic", year: "2008", title: "Inaugural Fairytale Champions", highlight: "Shane Warne leads an unheralded young squad to win the first ever IPL tournament.", outcome: "CHAMPIONS 2008 ★", badge: "INAUGURAL TITLE", milestoneKey: "RR_2008" },
    { era: "Young Gun Nursery", year: "2013–2021", title: "Developing India's Next Generation", highlight: "Pioneering the discovery of Sanju Samson, Karun Nair, and dynamic domestic talent.", outcome: "Playoffs Regulars", badge: "SCOUTING" },
    { era: "Jaiswal-Buttler Reign", year: "2022–2024", title: "Jos Buttler 4 Centuries & Final Run", highlight: "Jos Buttler scores 863 runs in 2022 taking RR to the final; Yashasvi Jaiswal explodes.", outcome: "Runners-Up 2022", badge: "TOP-3 POWER", milestoneKey: "GT_2022" },
    { era: "Championship Quest", year: "2025–2026", title: "Balancing Finishing Explosiveness", highlight: "Pairing elite powerplay pacing with tandem spin control in middle overs.", outcome: "Contenders", badge: "CHAMPIONSHIP PUSH" }
  ],
  DC: [
    { era: "Daredevils Era", year: "2008–2012", title: "Sehwag & Gambhir Top-Order Blasts", highlight: "Topping the league stage in 2009 and 2012 with devastating powerplay boundary hitting.", outcome: "Semi-Finalists", badge: "ORIGINAL RUN" },
    { era: "The Capitals Rebrand", year: "2019–2020", title: "Ponting-Iyer Duo & Dubai Final", highlight: "Rebranding to Delhi Capitals, reaching their first ever IPL Grand Final in 2020.", outcome: "Runners-Up 2020", badge: "GRAND FINAL", milestoneKey: "MI_2020" },
    { era: "Pant's Return", year: "2024", title: "Rishabh Pant Inspirational Comeback", highlight: "Heroic return to competitive cricket post-rehabilitation, rallying the capital franchise.", outcome: "Inspirational Run", badge: "RESILIENCE" },
    { era: "2027 Blueprint", year: "2025–2026", title: "Mega-Auction Pace Battery Focus", highlight: "Constructing high-ceiling Indian batting depth backed by express international quicks.", outcome: "Core Rebuild", badge: "BLUEPRINT" }
  ],
  PBKS: [
    { era: "Early Firepower", year: "2008", title: "Yuvraj & Marsh Orange Cap", highlight: "Shaun Marsh's breakout 616-run season leads Kings XI to the inaugural semi-finals.", outcome: "Semi-Finalists 2008", badge: "INAUGURAL RUN" },
    { era: "Maxwell-Miller Carnage", year: "2014", title: "The 2014 Table-Topping Rampage", highlight: "Glenn Maxwell's hurricane hitting and Wriddhiman Saha's final century taking Punjab to the final.", outcome: "Runners-Up 2014", badge: "FINAL RUN", milestoneKey: "KKR_2014" },
    { era: "KL Rahul Orange Dominance", year: "2018–2021", title: "Record Individual Boundary Seasons", highlight: "Fastest ever IPL fifty (14 balls) and consecutive 600+ season run tallies.", outcome: "Top Batter Honors", badge: "INDIVIDUAL GLORY" },
    { era: "Aggression Matrix", year: "2024–2026", title: "Uncapped Match-Winners Emerge", highlight: "Ashutosh Sharma and Shashank Singh engineer historic run-chases from impossible depths.", outcome: "Record Chasers", badge: "FEARLESS CORE" }
  ],
  GT: [
    { era: "Inaugural Sensation", year: "2022", title: "Maiden Season Championship Victory", highlight: "Hardik Pandya and Ashish Nehra steer new franchise to title glory at Narendra Modi Stadium.", outcome: "CHAMPIONS 2022 ★", badge: "DEBUT TITLE", milestoneKey: "GT_2022" },
    { era: "Consecutive Finalists", year: "2023", title: "Shubman Gill 890 Runs Masterclass", highlight: "Three playoff centuries from Gill taking Titans within one ball of back-to-back titles.", outcome: "Runners-Up 2023", badge: "FINALISTS", milestoneKey: "CSK_2023" },
    { era: "Shubman Captaincy Era", year: "2024–2026", title: "Tactical Discipline & Pace Assembly", highlight: "Youngest franchise captain implementing data-driven bowling plans and disciplined powerplays.", outcome: "Solid Contenders", badge: "NEW CAPTAINCY" }
  ],
  LSG: [
    { era: "Dual Playoff Starts", year: "2022–2023", title: "Back-to-Back Playoff Qualifications", highlight: "New franchise reaches playoffs in consecutive debut years under KL Rahul.", outcome: "Eliminator Finalists", badge: "DUAL PLAYOFFS" },
    { era: "Mayank Velocity Shock", year: "2024", title: "156.7 km/h Express Pace Arrival", highlight: "Mayank Yadav breaks tournament speedometers, bowling consecutive player-of-the-match spells.", outcome: "Breakout Sensation", badge: "EXPRESS VELOCITY" },
    { era: "2027 Reset", year: "2025–2026", title: "Ekana Spin-Pace Fortress Blueprint", highlight: "Engineering pitch-customized lineups for red/black soil flexibility in Lucknow.", outcome: "War Room Planning", badge: "TACTICAL PIVOT" }
  ]
};

// COMMUNITY FAN PARLIAMENT POLLS
const FRANCHISE_POLLS: Record<TeamCode, {
  question: string;
  category: string;
  options: Array<{ id: string; text: string; initialPct: number; votes: number }>;
  evidence: {
    statLine: string;
    analysis: string;
    dataPoint: string;
  };
}> = {
  RCB: {
    question: "Who is RCB's most critical mega-auction retention priority for 2027?",
    category: "SQUAD MANDATE",
    options: [
      { id: "opt1", text: "Virat Kohli (₹18 Cr Marquee Lock)", initialPct: 58, votes: 4820 },
      { id: "opt2", text: "Rajat Patidar (Middle-Overs Spin Destroyer)", initialPct: 24, votes: 1990 },
      { id: "opt3", text: "Mohammed Siraj / Express Seamer (Pace Spearhead)", initialPct: 12, votes: 996 },
      { id: "opt4", text: "Death-Overs Overseas Specialist (RTM Priority)", initialPct: 6, votes: 498 }
    ],
    evidence: {
      statLine: "Kohli 2026: 741 runs, 154.7 SR • Patidar: 178.4 SR vs Spin (overs 7-15)",
      analysis: "Data models demonstrate RCB's championship win correlation was driven by Patidar's spin acceleration preventing dot-ball accumulation between overs 7 and 14.",
      dataPoint: "+42% Win Probability when boundary rate exceeds 18% in middle overs."
    }
  },
  CSK: {
    question: "How should CSK allocate their ₹120 Cr purse between retentions and open auction?",
    category: "AUCTION WAR ROOM",
    options: [
      { id: "opt1", text: "Retain 5 Capped Core (Gaikwad, Jadeja, Pathirana, Dube, Conway)", initialPct: 45, votes: 3610 },
      { id: "opt2", text: "Retain 3 Marquee + Maximize RTM Flexibility at Auction", initialPct: 32, votes: 2568 },
      { id: "opt3", text: "Uncapped Dhoni Arbitrage (₹4 Cr) + Heavy Death Bowling Spend", initialPct: 23, votes: 1845 }
    ],
    evidence: {
      statLine: "Pathirana Death Economy: 7.72 RPO • Gaikwad Anchor Average: 42.8",
      analysis: "CSK's Chepauk fortress depends heavily on death-overs defense. Retaining Pathirana under ₹14 Cr saves an estimated ₹4.5 Cr open-market bidding premium.",
      dataPoint: "Chepauk second-innings defend rate: 64% when death economy is below 8.2."
    }
  },
  MI: {
    question: "What is MI's single biggest tactical void to fix before the next season?",
    category: "TACTICAL VOID",
    options: [
      { id: "opt1", text: "Secondary Express Seamer to partner Jasprit Bumrah", initialPct: 52, votes: 4120 },
      { id: "opt2", text: "Reliable Indian Middle-Overs Wrist Spinner", initialPct: 31, votes: 2450 },
      { id: "opt3", text: "Aggressive Overseas Finisher to relieve Hardik/David", initialPct: 17, votes: 1345 }
    ],
    evidence: {
      statLine: "Bumrah Economy: 6.48 RPO • Non-Bumrah MI Seamers: 10.84 RPO",
      analysis: "The disparity between Bumrah's control and the rest of the pace attack cost MI 4 close finishes in 2026. A sub-8.5 RPO partner is statistically the highest-leverage purchase.",
      dataPoint: "Opposition scoring rate spikes by +4.36 RPO in overs Bumrah does not bowl."
    }
  },
  KKR: {
    question: "Should KKR preserve the high-risk all-out boundary philosophy or add anchor stability?",
    category: "TACTICAL IDENTITY",
    options: [
      { id: "opt1", text: "Double Down on 200+ Strike Rate Pacing (All 20 overs)", initialPct: 62, votes: 2980 },
      { id: "opt2", text: "Incorporate an Indian Classical Anchor at #3", initialPct: 38, votes: 1820 }
    ],
    evidence: {
      statLine: "KKR 2024-2026 Average Powerplay: 68.4 runs (Tournament #1)",
      analysis: "Simulations reveal KKR's expected tournament points increase by 14% when playing ultra-aggressive openers even if all-out scores occur once every 8 matches.",
      dataPoint: "Win rate is 84% whenever Powerplay score exceeds 62 runs."
    }
  },
  SRH: {
    question: "What is the key to converting SRH's explosive batting into sustained championship consistency?",
    category: "STRATEGIC BALANCE",
    options: [
      { id: "opt1", text: "Upgrade Death Overs Bowling Economy (Currently 11.2 RPO)", initialPct: 66, votes: 3120 },
      { id: "opt2", text: "Deepen Indian Batting Reserves behind Head-Abhishek", initialPct: 34, votes: 1610 }
    ],
    evidence: {
      statLine: "Batting SR: 168.9 (#1) vs Death Bowling Economy: 11.24 (#9)",
      analysis: "SRH out-batted opponents in 11 matches but dropped 4 games when defending 200+ totals due to boundaries conceded in overs 17-20.",
      dataPoint: "Every 1.0 drop in death economy yields +2.1 projected wins across a 14-match season."
    }
  },
  RR: {
    question: "Which retention decision gives Rajasthan Royals the highest ceiling?",
    category: "RETENTION BLUEPRINT",
    options: [
      { id: "opt1", text: "Locking Top-3: Samson, Jaiswal, Parag", initialPct: 54, votes: 2150 },
      { id: "opt2", text: "Prioritizing Dual World-Class Spinners: Chahal + Ashwin", initialPct: 32, votes: 1270 },
      { id: "opt3", text: "Reserving ₹60 Cr+ Purse for Death Seamers at Auction", initialPct: 14, votes: 558 }
    ],
    evidence: {
      statLine: "Jaiswal PP Strike Rate: 164.2 • Parag Middle-Overs Average: 48.6",
      analysis: "Retaining young Indian top-order match-winners insulates RR from auction inflation, where equivalent top-3 international talent commands 35% higher purse allocations.",
      dataPoint: "Indian top-3 delivers highest purse-efficiency metric in IPL historical telemetry."
    }
  },
  DC: {
    question: "What is Delhi Capitals' primary target profile in the upcoming war room?",
    category: "SCOUT LAB",
    options: [
      { id: "opt1", text: "Proven Indian Pace-Bowling All-Rounder", initialPct: 48, votes: 1890 },
      { id: "opt2", text: "Express International Yorker Specialist", initialPct: 36, votes: 1410 },
      { id: "opt3", text: "Elite Wicketkeeper-Finisher", initialPct: 16, votes: 630 }
    ],
    evidence: {
      statLine: "DC lower-order dot ball %: 34.2% in overs 16-20",
      analysis: "An express all-rounder balances the impact-player substitution flexibility, allowing DC to lengthen batting depth to number 8.",
      dataPoint: "Teams batting down to #8 win 68% of 180+ chases."
    }
  },
  PBKS: {
    question: "How should Punjab Kings structure their tactical philosophy moving forward?",
    category: "CULTURE & TACTICS",
    options: [
      { id: "opt1", text: "Back Young Indian Finishers (Shashank & Ashutosh) with Full Trust", initialPct: 56, votes: 1680 },
      { id: "opt2", text: "Sign Marquee International Captain with Championship Pedigree", initialPct: 44, votes: 1320 }
    ],
    evidence: {
      statLine: "Shashank/Ashutosh Partnership Strike Rate in Death: 204.6",
      analysis: "Punjab's historic weakness was lack of local domestic identity. Backing breakout Indian match-winners generates long-term fan loyalty and squad continuity.",
      dataPoint: "Punjab achieved their highest fourth-innings win rate (58%) when empowering lower-order Indian hitters."
    }
  },
  GT: {
    question: "Should Gujarat Titans prioritize batting firepower or retain bowling strangulation?",
    category: "IDENTITY RADAR",
    options: [
      { id: "opt1", text: "Maintain Bowling Suffocation (Rashid, Shami, Mohit profile)", initialPct: 57, votes: 1980 },
      { id: "opt2", text: "Pivot to 220+ Powerplay Boundary Aggression", initialPct: 43, votes: 1490 }
    ],
    evidence: {
      statLine: "GT Win Rate defending 170+: 76.4% across franchise history",
      analysis: "The massive Narendra Modi Stadium outfield penalizes mindless slogging. GT's structural advantage is defending boundaries with discipline and defensive ground coverage.",
      dataPoint: "Ahmedabad square boundary is 75m; defensive fielding saves 14.8 runs per match."
    }
  },
  LSG: {
    question: "What is Lucknow's highest priority for home ground optimization at Ekana?",
    category: "VENUE OPTIMIZATION",
    options: [
      { id: "opt1", text: "Specialized Wrist-Spin & Slower-Ball Cutters for Black Soil", initialPct: 51, votes: 1420 },
      { id: "opt2", text: "Express Pace (Mayank Yadav) on High-Bounce Red Soil", initialPct: 49, votes: 1360 }
    ],
    evidence: {
      statLine: "Ekana Black Soil 1st innings par: 164 • Red Soil par: 188",
      analysis: "Having a squad that can pivot between express 150 km/h bouncers and 110 km/h cutters provides LSG with an unparalleled home surface tactical advantage.",
      dataPoint: "Surface adaptability generates a +22% home win conversion edge."
    }
  }
};

export default function DugoutPage() {
  const [, params] = useRoute("/dugout/:team");
  const { selectedTeam, setSelectedTeam, theme, allTeams } = useTeamTheme();
  
  // Active team derived from route or context
  const activeTeamCode: TeamCode = (params?.team && params.team.toUpperCase() in TEAM_REGISTRY)
    ? (params.team.toUpperCase() as TeamCode)
    : (selectedTeam || "RCB");

  const currentTeam = TEAM_REGISTRY[activeTeamCode];
  const journey = FRANCHISE_JOURNEYS[activeTeamCode] || FRANCHISE_JOURNEYS.RCB;
  const poll = FRANCHISE_POLLS[activeTeamCode] || FRANCHISE_POLLS.RCB;

  // Poll voting state
  const [userVotedOption, setUserVotedOption] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [pollOptions, setPollOptions] = useState(poll.options);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const teamVideos = useMemo(() => getVideosByTeam(activeTeamCode), [activeTeamCode]);

  // Sync route param with context if valid
  useEffect(() => {
    if (params?.team && params.team.toUpperCase() in TEAM_REGISTRY) {
      const code = params.team.toUpperCase() as TeamCode;
      if (selectedTeam !== code) {
        setSelectedTeam(code);
      }
    }
  }, [params?.team]);

  // Load vote from localStorage
  useEffect(() => {
    const storageKey = `beyond_xi_poll_${activeTeamCode}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setUserVotedOption(saved);
    } else {
      setUserVotedOption(null);
    }
    setPollOptions(poll.options);
    setShowEvidence(false);
  }, [activeTeamCode]);

  const handleVote = (optionId: string) => {
    if (userVotedOption) return;
    setUserVotedOption(optionId);
    try {
      localStorage.setItem(`beyond_xi_poll_${activeTeamCode}`, optionId);
    } catch (e) {
      // ignore
    }

    setPollOptions(prev => {
      const updated = prev.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o);
      const total = updated.reduce((acc, curr) => acc + curr.votes, 0);
      return updated.map(o => ({
        ...o,
        initialPct: Math.round((o.votes / total) * 100)
      }));
    });
  };

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-8">
        
        {/* ═══════════════════════════════════════════════════════════════════
            1. FRANCHISE BANNER & IDENTITY SPOTLIGHT
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative rounded-[28px] overflow-hidden border border-white/10 shadow-2xl bg-[#090E1A]">
          {/* Backdrop photo with ambient franchise lighting */}
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={currentTeam.bannerImg}
              alt={currentTeam.name}
              className="w-full h-full object-cover object-center opacity-30 brightness-75 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#090E1A] via-[#090E1A]/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090E1A] via-transparent to-black/40" />
            <div
              className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-30"
              style={{ backgroundColor: currentTeam.accent }}
            />
          </div>

          <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Franchise Crest Badge */}
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-3 flex items-center justify-center border shadow-2xl shrink-0"
                style={{
                  backgroundColor: `${currentTeam.surfaceTint}`,
                  borderColor: `${currentTeam.accent}66`,
                  boxShadow: `0 0 24px ${currentTeam.glow}`
                }}
              >
                <img src={currentTeam.logoImg} alt={currentTeam.name} className="w-full h-full object-contain" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest border"
                    style={{
                      backgroundColor: `${currentTeam.accent}22`,
                      borderColor: `${currentTeam.accent}55`,
                      color: currentTeam.accent
                    }}
                  >
                    MY DUGOUT • FRANCHISE HEADQUARTERS
                  </span>
                  {currentTeam.titles > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[9px] font-black uppercase flex items-center gap-1 font-mono">
                      <Trophy className="w-2.5 h-2.5" />
                      {currentTeam.titles}x Champions ({currentTeam.titleYears.join(", ")})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-[9px] font-mono">
                      Contender
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                  {currentTeam.name}
                </h1>
                <p className="text-xs text-white/70 mt-1 max-w-xl font-medium">
                  {currentTeam.motto} • Your history. Your intelligence. Your decisions.
                </p>
              </div>
            </div>

            {/* Quick Franchise Select Strip */}
            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                Switch Dugout
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {allTeams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTeam(t.id)}
                    className={`w-7 h-7 rounded-lg p-1 border transition-all cursor-pointer flex items-center justify-center ${
                      t.id === activeTeamCode
                        ? "ring-2 scale-110 shadow-lg"
                        : "opacity-60 hover:opacity-100 hover:scale-105 bg-white/5 border-white/10"
                    }`}
                    style={{
                      borderColor: t.id === activeTeamCode ? t.accent : undefined,
                      backgroundColor: t.id === activeTeamCode ? `${t.surfaceTint}` : undefined,
                    }}
                    title={t.name}
                  >
                    <img src={t.logoImg} alt={t.shortName} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            2. INTERCONNECTED ACTION HUBS (THE 4 PILLARS)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/stats" className="group">
            <GlassCard className="p-4 rounded-2xl border-white/10 hover:border-white/30 transition-all cursor-pointer h-full flex flex-col justify-between group-hover:scale-[1.01]">
              <div className="space-y-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border"
                  style={{ backgroundColor: `${currentTeam.accent}22`, borderColor: `${currentTeam.accent}44`, color: currentTeam.accent }}
                >
                  <BarChart2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black uppercase text-white tracking-tight">
                  Franchise Telemetry
                </h3>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Analyze ball-by-ball performance, win probabilities, and phase splits for {currentTeam.shortName}.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] font-mono text-white/40 group-hover:text-white transition-colors">
                <span>OPEN STATS MATRIX</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </GlassCard>
          </Link>

          <Link href="/auction" className="group">
            <GlassCard className="p-4 rounded-2xl border-white/10 hover:border-white/30 transition-all cursor-pointer h-full flex flex-col justify-between group-hover:scale-[1.01]">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-amber-500/20 border-amber-500/30 text-amber-400">
                  <Gavel className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black uppercase text-white tracking-tight">
                  Auction War Room
                </h3>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Manage the ₹120 Cr salary cap, test retentions, and bid against simulator engines.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] font-mono text-white/40 group-hover:text-white transition-colors">
                <span>SIMULATE SQUAD AUCTION</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </GlassCard>
          </Link>

          <Link href="/feed" className="group">
            <GlassCard className="p-4 rounded-2xl border-white/10 hover:border-white/30 transition-all cursor-pointer h-full flex flex-col justify-between group-hover:scale-[1.01]">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-cyan-500/20 border-cyan-500/30 text-cyan-400">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black uppercase text-white tracking-tight">
                  Tactical Command
                </h3>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Inspect retention rules, pitch condition heatmaps, and top breakout stars for 2027.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] font-mono text-white/40 group-hover:text-white transition-colors">
                <span>EXPLORE 2027 INTEL</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </GlassCard>
          </Link>

          <Link href="/ai-analyst" className="group">
            <GlassCard className="p-4 rounded-2xl border-white/10 hover:border-white/30 transition-all cursor-pointer h-full flex flex-col justify-between group-hover:scale-[1.01]">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-purple-500/20 border-purple-500/30 text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black uppercase text-white tracking-tight">
                  AI Tactical Coach
                </h3>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Query Google Gemini on {currentTeam.shortName}'s death-overs defense and matchup vectors.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] font-mono text-white/40 group-hover:text-white transition-colors">
                <span>CONSULT GEMINI ANALYST</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </GlassCard>
          </Link>
        </div>

        {/* BEYOND XI FAN ARENA CALLOUT BANNER */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-cyan-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shrink-0 shadow-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-amber-300 tracking-wider">BEYOND XI COMMUNITY PLATFORM</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/60">12 Features Live</span>
              </div>
              <p className="text-xs text-white/70 mt-0.5">
                Switch identities (The Fan, The Analyst, The Selector), explore the Scout Lab, and view Community Intelligence.
              </p>
            </div>
          </div>
          <Link href="/arena">
            <button className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-amber-400/20">
              <span>Enter Beyond XI Arena</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            3. FAN PARLIAMENT: COMMUNITY POLL & DATA EVIDENCE
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative">
          <GlassCard className="p-6 rounded-3xl border-purple-500/20 bg-[#0A0E1C]/90 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-widest">
                      FAN PARLIAMENT • PUBLIC VOICE
                    </span>
                    <span className="text-[10px] text-white/20">•</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      COMMUNITY CONSENSUS ACTIVE
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-tight">
                    {poll.question}
                  </h2>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[9px] font-black uppercase tracking-wider self-start sm:self-auto">
                {poll.category}
              </span>
            </div>

            {/* Voting Options */}
            <div className="space-y-3">
              {pollOptions.map((opt) => {
                const isSelected = userVotedOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/20 ring-1 ring-primary shadow-lg"
                        : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]"
                    }`}
                  >
                    {/* Background Progress Bar Fill */}
                    {userVotedOption && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${opt.initialPct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute inset-y-0 left-0 bg-primary/20 pointer-events-none rounded-2xl"
                      />
                    )}

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] shrink-0 ${
                          isSelected
                            ? "bg-primary border-primary text-white"
                            : "border-white/20 text-white/40 group-hover:border-white/40"
                        }`}>
                          {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-white">
                          {opt.text}
                        </span>
                      </div>

                      {userVotedOption && (
                        <div className="flex items-center gap-2 pl-3">
                          <span className="text-xs font-mono font-black text-amber-400">
                            {opt.initialPct}%
                          </span>
                          <span className="text-[10px] font-mono text-white/40 hidden sm:inline">
                            ({opt.votes.toLocaleString()} votes)
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Evidence Drawer Prompt */}
            <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-white/60">
                {userVotedOption
                  ? "✓ Your vote has been recorded and indexed in the Community Intelligence dataset."
                  : "Click any option above to cast your fan vote and unlock live public consensus."}
              </span>

              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all cursor-pointer font-mono text-[11px] self-start sm:self-auto"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>{showEvidence ? "Hide Data Evidence" : "Inspect Data Evidence"}</span>
              </button>
            </div>

            {/* Expandable Data Evidence Box */}
            <AnimatePresence>
              {showEvidence && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Quantitative Evidence Engine • What Do the Numbers Say?</span>
                    </div>
                    <p className="text-xs text-white/90 font-mono font-semibold">
                      {poll.evidence.statLine}
                    </p>
                    <p className="text-xs text-white/70 leading-relaxed">
                      {poll.evidence.analysis}
                    </p>
                    <div className="pt-2 border-t border-cyan-500/20 text-[11px] font-mono text-amber-300">
                      ★ Key Analytical Finding: {poll.evidence.dataPoint}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </div>

        {/* NATIVE AD VESSEL — Franchise Partner Telemetry */}
        <div className="pt-2">
          <AdVessel slot="1029384760" format="horizontal" label="Franchise Partner Briefing · Official Dugout Telemetry" />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            4. FRANCHISE TIMELINE & HISTORICAL MILESTONES (2008–2026)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
                CHRONICLES & DEFINING TURNING POINTS
              </span>
              <h2 className="text-lg font-black uppercase text-white tracking-wide flex items-center gap-2">
                {currentTeam.shortName} Historical Journey (2008–2026)
              </h2>
            </div>
            <span className="text-xs font-mono text-amber-400 font-bold">
              18 IPL SEASONS INDEXED
            </span>
          </div>

          {/* Celebrated Broadcaster Highlight Banner */}
          {(() => {
            const celebrated = getFranchiseCelebratedHighlight(currentTeam.id);
            return celebrated ? (
              <BroadcasterLink highlight={celebrated} variant="banner" label="Watch Landmark Final" />
            ) : null;
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {journey.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#0B1020] border border-white/10 flex flex-col justify-between hover:border-white/30 transition-all space-y-4 relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-white/40 font-bold">
                      {item.year}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border font-mono"
                      style={{
                        backgroundColor: `${currentTeam.accent}22`,
                        borderColor: `${currentTeam.accent}55`,
                        color: currentTeam.accent
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white uppercase leading-snug mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-white/70 leading-relaxed">
                    {item.highlight}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-white/40">Campaign:</span>
                    <span className="font-bold text-amber-300">{item.outcome}</span>
                  </div>
                  <BroadcasterLink
                    lookupParams={{
                      milestoneKey: item.milestoneKey,
                      eraYear: item.year,
                      franchise: currentTeam.id
                    }}
                    variant="pill"
                    label="Watch Replay"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            4B. FRANCHISE VIDEO VAULT • OFFICIAL JIOHOTSTAR HIGHLIGHTS
           ═══════════════════════════════════════════════════════════════════ */}
        {teamVideos.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4" style={{ color: currentTeam.accent }} />
                <h3 className="text-sm font-black uppercase text-white tracking-wide">
                  {currentTeam.shortName} Video Vault • Official JioHotstar Highlights
                </h3>
              </div>
              <button
                onClick={() => setIsArchiveOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <span>Full Archive</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <VideoShelf
              title={`${currentTeam.name} Highlights & Moments`}
              subtitle={`Official replays, top innings, and milestone clips featuring ${currentTeam.shortName}`}
              badge={`${teamVideos.length} Videos`}
              videos={teamVideos}
              onOpenArchive={() => setIsArchiveOpen(true)}
            />

            <AdVessel
              slot="dugout-video-vault-sponsor"
              format="in-feed"
              label={`Sponsored Partner Briefing · ${currentTeam.shortName} Video Vault`}
              className="my-3"
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            5. ARCH-RIVALRY ARENA
           ═══════════════════════════════════════════════════════════════════ */}
        {currentTeam.archRival && TEAM_REGISTRY[currentTeam.archRival] && (
          <GlassCard className="p-6 rounded-3xl border-red-500/20 bg-[#0B0D18]/90 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-black uppercase text-white tracking-wide">
                  Arch-Rivalry Pulse • {currentTeam.shortName} vs {TEAM_REGISTRY[currentTeam.archRival].shortName}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-white/40 uppercase">
                Historical Clashes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="w-12 h-12 mx-auto rounded-xl p-1.5 border" style={{ borderColor: `${currentTeam.accent}44` }}>
                  <img src={currentTeam.logoImg} alt={currentTeam.name} className="w-full h-full object-contain" />
                </div>
                <div className="text-sm font-black text-white">{currentTeam.name}</div>
                <div className="text-[11px] font-mono text-white/50">{currentTeam.titles} IPL Titles</div>
              </div>

              <div className="space-y-2">
                <span className="text-2xl font-black font-mono text-amber-400">VS</span>
                <p className="text-xs text-white/70">
                  One of the most fiercely debated tactical battles in global cricket.
                </p>
                <Link
                  href={`/stats`}
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-primary hover:underline"
                >
                  <span>Compare Head-to-Head Stats</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="w-12 h-12 mx-auto rounded-xl p-1.5 border" style={{ borderColor: `${TEAM_REGISTRY[currentTeam.archRival].accent}44` }}>
                  <img src={TEAM_REGISTRY[currentTeam.archRival].logoImg} alt={TEAM_REGISTRY[currentTeam.archRival].name} className="w-full h-full object-contain" />
                </div>
                <div className="text-sm font-black text-white">{TEAM_REGISTRY[currentTeam.archRival].name}</div>
                <div className="text-[11px] font-mono text-white/50">{TEAM_REGISTRY[currentTeam.archRival].titles} IPL Titles</div>
              </div>
            </div>
          </GlassCard>
        )}

      </div>

      <VideoArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        initialTeam={activeTeamCode}
      />
    </Layout>
  );
}
