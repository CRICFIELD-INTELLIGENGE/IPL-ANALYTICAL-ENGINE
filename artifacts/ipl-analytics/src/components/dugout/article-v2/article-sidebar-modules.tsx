import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Activity,
  ArrowRight,
  BarChart2,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Database,
  ExternalLink,
  Flame,
  Layers,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  User,
  Users,
  Zap,
} from "lucide-react";
import type { LoadedArticle } from "@/lib/editorial-v2";
import type { IndexEntry, PlanEntry } from "@/data/editorial/schema";
import { FRANCHISE_METADATA } from "@/data/editorial-magazine-data";

export interface PlayerBio {
  slug: string;
  name: string;
  role: string;
  teamCode: string;
  country: string;
  image: string;
  iplStatsSummary: string;
}

export const KNOWN_PLAYERS: Record<string, PlayerBio> = {
  // Mumbai Indians
  "jasprit-bumrah": {
    slug: "jasprit-bumrah",
    name: "Jasprit Bumrah",
    role: "Fast Bowler · India",
    teamCode: "MI",
    country: "India",
    image: "/players/mi-2026/jasprit-bumrah.webp",
    iplStatsSummary: "165 wkts · 7.30 econ · 20 wkts (2024)",
  },
  "rohit-sharma": {
    slug: "rohit-sharma",
    name: "Rohit Sharma",
    role: "Opening Batter · India",
    teamCode: "MI",
    country: "India",
    image: "/players/mi-2026/rohit-sharma.webp",
    iplStatsSummary: "6,628 runs · 131.14 SR · 5x Champion",
  },
  "suryakumar-yadav": {
    slug: "suryakumar-yadav",
    name: "Suryakumar Yadav",
    role: "T20 Specialist · India",
    teamCode: "MI",
    country: "India",
    image: "/players/mi-2026/suryakumar-yadav.webp",
    iplStatsSummary: "3,594 runs · 145.32 SR · 102* (2024)",
  },
  "hardik-pandya": {
    slug: "hardik-pandya",
    name: "Hardik Pandya",
    role: "Captain & All-Rounder · India",
    teamCode: "MI",
    country: "India",
    image: "/players/mi-2026/hardik-pandya.webp",
    iplStatsSummary: "2,525 runs · 145.87 SR · 64 wkts",
  },
  "tilak-varma": {
    slug: "tilak-varma",
    name: "Tilak Varma",
    role: "Middle-Order Batter · India",
    teamCode: "MI",
    country: "India",
    image: "/players/mi-2026/tilak-varma.webp",
    iplStatsSummary: "1,156 runs · 146.33 SR · Retained",
  },

  // Chennai Super Kings
  "ms-dhoni": {
    slug: "ms-dhoni",
    name: "MS Dhoni",
    role: "Wicketkeeper-Batter · India",
    teamCode: "CSK",
    country: "India",
    image: "/players/csk-2026/ms-dhoni.webp",
    iplStatsSummary: "5,243 runs · 137.53 SR · 5x Champion",
  },
  "ruturaj-gaikwad": {
    slug: "ruturaj-gaikwad",
    name: "Ruturaj Gaikwad",
    role: "Captain & Opening Batter · India",
    teamCode: "CSK",
    country: "India",
    image: "/players/csk-2026/ruturaj-gaikwad.webp",
    iplStatsSummary: "583 runs · 141.16 SR · 108* High",
  },
  "sanju-samson": {
    slug: "sanju-samson",
    name: "Sanju Samson",
    role: "Wicketkeeper-Batter · India",
    teamCode: "CSK",
    country: "India",
    image: "/players/csk-2026/sanju-samson.webp",
    iplStatsSummary: "531 runs · 153.46 SR · 5x 50s (2024)",
  },
  "shivam-dube": {
    slug: "shivam-dube",
    name: "Shivam Dube",
    role: "Spin Enforcer · India",
    teamCode: "CSK",
    country: "India",
    image: "/players/csk-2026/shivam-dube.webp",
    iplStatsSummary: "396 runs · 162.30 SR · 26 sixes",
  },

  // Royal Challengers Bengaluru
  "virat-kohli": {
    slug: "virat-kohli",
    name: "Virat Kohli",
    role: "Top-Order Batter · India",
    teamCode: "RCB",
    country: "India",
    image: "/players/rcb-2026/virat-kohli.webp",
    iplStatsSummary: "741 runs · 154.69 SR · Orange Cap 2024",
  },
  "rajat-patidar": {
    slug: "rajat-patidar",
    name: "Rajat Patidar",
    role: "Middle-Order Spin Basher · India",
    teamCode: "RCB",
    country: "India",
    image: "/players/rcb-2026/rajat-patidar.webp",
    iplStatsSummary: "395 runs · 177.13 SR · 33 sixes",
  },
  "bhuvneshwar-kumar": {
    slug: "bhuvneshwar-kumar",
    name: "Bhuvneshwar Kumar",
    role: "Swing Bowler · India",
    teamCode: "RCB",
    country: "India",
    image: "/players/rcb-2026/bhuvneshwar-kumar.webp",
    iplStatsSummary: "181 IPL career wkts · 7.56 econ",
  },
  "yash-dayal": {
    slug: "yash-dayal",
    name: "Yash Dayal",
    role: "Left-arm Fast Bowler · India",
    teamCode: "RCB",
    country: "India",
    image: "/players/rcb-2026/yash-dayal.webp",
    iplStatsSummary: "15 wkts · 9.14 econ · Retained",
  },
  "phil-salt": {
    slug: "phil-salt",
    name: "Phil Salt",
    role: "Wicketkeeper-Batter · England",
    teamCode: "RCB",
    country: "England",
    image: "/players/rcb-2026/phil-salt.webp",
    iplStatsSummary: "435 runs · 182.00 SR (2024)",
  },

  // Sunrisers Hyderabad
  "pat-cummins": {
    slug: "pat-cummins",
    name: "Pat Cummins",
    role: "Captain & Fast Bowler · Australia",
    teamCode: "SRH",
    country: "Australia",
    image: "/players/srh-2026/pat-cummins.webp",
    iplStatsSummary: "18 wkts · 8.98 econ · 2024 Finalist",
  },
  "travis-head": {
    slug: "travis-head",
    name: "Travis Head",
    role: "Opening Batter · Australia",
    teamCode: "SRH",
    country: "Australia",
    image: "/players/srh-2026/travis-head.webp",
    iplStatsSummary: "567 runs · 191.55 SR (2024)",
  },
  "abhishek-sharma": {
    slug: "abhishek-sharma",
    name: "Abhishek Sharma",
    role: "Opening All-Rounder · India",
    teamCode: "SRH",
    country: "India",
    image: "/players/srh-2026/abhishek-sharma.webp",
    iplStatsSummary: "484 runs · 204.21 SR · 42 sixes",
  },
  "heinrich-klaasen": {
    slug: "heinrich-klaasen",
    name: "Heinrich Klaasen",
    role: "Middle-Order Finisher · South Africa",
    teamCode: "SRH",
    country: "South Africa",
    image: "/players/srh-2026/heinrich-klaasen.webp",
    iplStatsSummary: "479 runs · 171.07 SR · 38 sixes",
  },
  "nitish-kumar-reddy": {
    slug: "nitish-kumar-reddy",
    name: "Nitish Kumar Reddy",
    role: "Batting All-Rounder · India",
    teamCode: "SRH",
    country: "India",
    image: "/players/srh-2026/nitish-kumar-reddy.webp",
    iplStatsSummary: "303 runs · 142.92 SR · Emerging Player",
  },

  // Kolkata Knight Riders
  "sunil-narine": {
    slug: "sunil-narine",
    name: "Sunil Narine",
    role: "MVP All-Rounder · West Indies",
    teamCode: "KKR",
    country: "West Indies",
    image: "/players/kkr-2026/sunil-narine.webp",
    iplStatsSummary: "488 runs (180.74 SR) + 17 wkts · 2024 MVP",
  },
  "rinku-singh": {
    slug: "rinku-singh",
    name: "Rinku Singh",
    role: "Death-Overs Finisher · India",
    teamCode: "KKR",
    country: "India",
    image: "/players/kkr-2026/rinku-singh.webp",
    iplStatsSummary: "893 career runs · 143.34 SR · Retained",
  },
  "varun-chakravarthy": {
    slug: "varun-chakravarthy",
    name: "Varun Chakravarthy",
    role: "Mystery Spinner · India",
    teamCode: "KKR",
    country: "India",
    image: "/players/kkr-2026/varun-chakravarthy.webp",
    iplStatsSummary: "21 wkts · 8.04 econ · Champion 2024",
  },
  "ajinkya-rahane": {
    slug: "ajinkya-rahane",
    name: "Ajinkya Rahane",
    role: "Top-Order Batter · India",
    teamCode: "KKR",
    country: "India",
    image: "/players/kkr-2026/ajinkya-rahane.webp",
    iplStatsSummary: "4,642 runs · 123.42 SR · 30x 50s",
  },

  // Rajasthan Royals
  "yashasvi-jaiswal": {
    slug: "yashasvi-jaiswal",
    name: "Yashasvi Jaiswal",
    role: "Opening Batter · India",
    teamCode: "RR",
    country: "India",
    image: "/players/rr-2026/yashasvi-jaiswal.webp",
    iplStatsSummary: "435 runs · 155.91 SR · 104* (2024)",
  },
  "ravindra-jadeja": {
    slug: "ravindra-jadeja",
    name: "Ravindra Jadeja",
    role: "Spin All-Rounder · India",
    teamCode: "RR",
    country: "India",
    image: "/players/rr-2026/ravindra-jadeja.webp",
    iplStatsSummary: "2,959 runs · 160 wkts · 7.60 econ",
  },
  "jofra-archer": {
    slug: "jofra-archer",
    name: "Jofra Archer",
    role: "Express Fast Bowler · England",
    teamCode: "RR",
    country: "England",
    image: "/players/rr-2026/jofra-archer.webp",
    iplStatsSummary: "48 wkts · 7.13 econ · 150+ km/h pace",
  },
  "riyan-parag": {
    slug: "riyan-parag",
    name: "Riyan Parag",
    role: "Middle-Order Batter · India",
    teamCode: "RR",
    country: "India",
    image: "/players/rr-2026/riyan-parag.webp",
    iplStatsSummary: "573 runs · 149.22 SR · 4x 50s (2024)",
  },

  // Gujarat Titans
  "shubman-gill": {
    slug: "shubman-gill",
    name: "Shubman Gill",
    role: "Captain & Opening Batter · India",
    teamCode: "GT",
    country: "India",
    image: "/players/gt-2026/shubman-gill.webp",
    iplStatsSummary: "426 runs · 147.40 SR · 104 (2024)",
  },
  "jos-buttler": {
    slug: "jos-buttler",
    name: "Jos Buttler",
    role: "Opening Batter & WK · England",
    teamCode: "GT",
    country: "England",
    image: "/players/gt-2026/jos-buttler.webp",
    iplStatsSummary: "3,582 runs · 147.53 SR · 7x Centuries",
  },
  "rashid-khan": {
    slug: "rashid-khan",
    name: "Rashid Khan",
    role: "Leg-Spin All-Rounder · Afghanistan",
    teamCode: "GT",
    country: "Afghanistan",
    image: "/players/gt-2026/rashid-khan.webp",
    iplStatsSummary: "149 wkts · 6.82 econ · 154.67 SR",
  },
  "mohammed-siraj": {
    slug: "mohammed-siraj",
    name: "Mohammed Siraj",
    role: "Fast Bowler · India",
    teamCode: "GT",
    country: "India",
    image: "/players/gt-2026/mohammed-siraj.webp",
    iplStatsSummary: "93 wkts · 8.65 econ · Powerplay Pacer",
  },

  // Lucknow Super Giants
  "rishabh-pant": {
    slug: "rishabh-pant",
    name: "Rishabh Pant",
    role: "Captain & Wicketkeeper · India",
    teamCode: "LSG",
    country: "India",
    image: "/players/lsg-2026/rishabh-pant.webp",
    iplStatsSummary: "3,284 runs · 148.93 SR · 18x 50s",
  },
  "nicholas-pooran": {
    slug: "nicholas-pooran",
    name: "Nicholas Pooran",
    role: "Wicketkeeper-Finisher · West Indies",
    teamCode: "LSG",
    country: "West Indies",
    image: "/players/lsg-2026/nicholas-pooran.webp",
    iplStatsSummary: "499 runs · 178.21 SR · 36 sixes (2024)",
  },
  "mayank-yadav": {
    slug: "mayank-yadav",
    name: "Mayank Yadav",
    role: "Express Pacer · India",
    teamCode: "LSG",
    country: "India",
    image: "/players/lsg-2026/mayank-yadav.webp",
    iplStatsSummary: "7 wkts · 6.99 econ · 156.7 km/h pace",
  },
  "mohammed-shami": {
    slug: "mohammed-shami",
    name: "Mohammed Shami",
    role: "Seam Specialist · India",
    teamCode: "LSG",
    country: "India",
    image: "/players/lsg-2026/mohammed-shami.webp",
    iplStatsSummary: "127 wkts · 8.44 econ · Purple Cap winner",
  },

  // Delhi Capitals
  "kl-rahul": {
    slug: "kl-rahul",
    name: "KL Rahul",
    role: "Top-Order Batter · India",
    teamCode: "DC",
    country: "India",
    image: "/players/dc-2026/kl-rahul.webp",
    iplStatsSummary: "4,683 runs · 134.61 SR · 4x Centuries",
  },
  "axar-patel": {
    slug: "axar-patel",
    name: "Axar Patel",
    role: "Spin All-Rounder · India",
    teamCode: "DC",
    country: "India",
    image: "/players/dc-2026/axar-patel.webp",
    iplStatsSummary: "1,653 runs · 130.88 SR · 123 wkts",
  },
  "kuldeep-yadav": {
    slug: "kuldeep-yadav",
    name: "Kuldeep Yadav",
    role: "Left-Arm Wrist Spinner · India",
    teamCode: "DC",
    country: "India",
    image: "/players/dc-2026/kuldeep-yadav.webp",
    iplStatsSummary: "87 wkts · 8.13 econ · 16 wkts (2024)",
  },
  "mitchell-starc": {
    slug: "mitchell-starc",
    name: "Mitchell Starc",
    role: "Left-Arm Express Fast · Australia",
    teamCode: "DC",
    country: "Australia",
    image: "/players/dc-2026/mitchell-starc.webp",
    iplStatsSummary: "51 wkts · 8.21 econ · Final POTM 2024",
  },
  "t-natarajan": {
    slug: "t-natarajan",
    name: "T Natarajan",
    role: "Death Specialist · India",
    teamCode: "DC",
    country: "India",
    image: "/players/dc-2026/t-natarajan.webp",
    iplStatsSummary: "67 wkts · 8.82 econ · 19 wkts (2024)",
  },

  // Punjab Kings
  "shashank-singh": {
    slug: "shashank-singh",
    name: "Shashank Singh",
    role: "Finisher · India",
    teamCode: "PBKS",
    country: "India",
    image: "/players/pbks-2026/shashank-singh.webp",
    iplStatsSummary: "354 runs · 164.65 SR · 168.4 death SR",
  },
  "shreyas-iyer": {
    slug: "shreyas-iyer",
    name: "Shreyas Iyer",
    role: "Captain & Batter · India",
    teamCode: "PBKS",
    country: "India",
    image: "/players/pbks-2026/shreyas-iyer.webp",
    iplStatsSummary: "3,127 runs · 127.48 SR · Title Champion",
  },
  "arshdeep-singh": {
    slug: "arshdeep-singh",
    name: "Arshdeep Singh",
    role: "Left-Arm Death Bowler · India",
    teamCode: "PBKS",
    country: "India",
    image: "/players/pbks-2026/arshdeep-singh.webp",
    iplStatsSummary: "76 wkts · 9.03 econ · 19 wkts (2024)",
  },
  "yuzvendra-chahal": {
    slug: "yuzvendra-chahal",
    name: "Yuzvendra Chahal",
    role: "Leg Spinner · India",
    teamCode: "PBKS",
    country: "India",
    image: "/players/pbks-2026/yuzvendra-chahal.webp",
    iplStatsSummary: "205 IPL career wkts (All-Time Record)",
  },
};

const PLAYER_NAME_ALIASES: Record<string, string> = {
  // Mumbai Indians
  "bumrah": "jasprit-bumrah",
  "jasprit bumrah": "jasprit-bumrah",
  "j bumrah": "jasprit-bumrah",
  "rohit": "rohit-sharma",
  "rohit sharma": "rohit-sharma",
  "rg sharma": "rohit-sharma",
  "surya": "suryakumar-yadav",
  "suryakumar yadav": "suryakumar-yadav",
  "suryakumar": "suryakumar-yadav",
  "sa yadav": "suryakumar-yadav",
  "sky": "suryakumar-yadav",
  "hardik": "hardik-pandya",
  "hardik pandya": "hardik-pandya",
  "hh pandya": "hardik-pandya",
  "tilak": "tilak-varma",
  "tilak varma": "tilak-varma",
  
  // Chennai Super Kings
  "dhoni": "ms-dhoni",
  "ms dhoni": "ms-dhoni",
  "ruturaj": "ruturaj-gaikwad",
  "ruturaj gaikwad": "ruturaj-gaikwad",
  "rd gaikwad": "ruturaj-gaikwad",
  "samson": "sanju-samson",
  "sanju samson": "sanju-samson",
  "sv samson": "sanju-samson",
  "dube": "shivam-dube",
  "shivam dube": "shivam-dube",
  "s dube": "shivam-dube",
  
  // Royal Challengers Bengaluru
  "kohli": "virat-kohli",
  "virat kohli": "virat-kohli",
  "v kohli": "virat-kohli",
  "patidar": "rajat-patidar",
  "rajat patidar": "rajat-patidar",
  "rm patidar": "rajat-patidar",
  "dayal": "yash-dayal",
  "yash dayal": "yash-dayal",
  "bhuvneshwar": "bhuvneshwar-kumar",
  "bhuvneshwar kumar": "bhuvneshwar-kumar",
  "b kumar": "bhuvneshwar-kumar",
  "salt": "phil-salt",
  "phil salt": "phil-salt",
  "pd salt": "phil-salt",
  
  // Sunrisers Hyderabad
  "cummins": "pat-cummins",
  "pat cummins": "pat-cummins",
  "pj cummins": "pat-cummins",
  "head": "travis-head",
  "travis head": "travis-head",
  "tm head": "travis-head",
  "abhishek": "abhishek-sharma",
  "abhishek sharma": "abhishek-sharma",
  "klaasen": "heinrich-klaasen",
  "heinrich klaasen": "heinrich-klaasen",
  "h klaasen": "heinrich-klaasen",
  "nitish reddy": "nitish-kumar-reddy",
  "nitish kumar reddy": "nitish-kumar-reddy",
  "nithish kumar reddy": "nitish-kumar-reddy",
  
  // Kolkata Knight Riders
  "narine": "sunil-narine",
  "sunil narine": "sunil-narine",
  "s narine": "sunil-narine",
  "rinku": "rinku-singh",
  "rinku singh": "rinku-singh",
  "varun chakravarthy": "varun-chakravarthy",
  "chakravarthy": "varun-chakravarthy",
  "rahane": "ajinkya-rahane",
  "ajinkya rahane": "ajinkya-rahane",
  "am rahane": "ajinkya-rahane",
  
  // Rajasthan Royals
  "jaiswal": "yashasvi-jaiswal",
  "yashasvi jaiswal": "yashasvi-jaiswal",
  "ybk jaiswal": "yashasvi-jaiswal",
  "jadeja": "ravindra-jadeja",
  "ravindra jadeja": "ravindra-jadeja",
  "ra jadeja": "ravindra-jadeja",
  "archer": "jofra-archer",
  "jofra archer": "jofra-archer",
  "jc archer": "jofra-archer",
  "parag": "riyan-parag",
  "riyan parag": "riyan-parag",
  "r parag": "riyan-parag",
  
  // Gujarat Titans
  "gill": "shubman-gill",
  "shubman gill": "shubman-gill",
  "s gill": "shubman-gill",
  "buttler": "jos-buttler",
  "jos buttler": "jos-buttler",
  "jc buttler": "jos-buttler",
  "rashid": "rashid-khan",
  "rashid khan": "rashid-khan",
  "siraj": "mohammed-siraj",
  "mohammed siraj": "mohammed-siraj",
  
  // Lucknow Super Giants
  "pant": "rishabh-pant",
  "rishabh pant": "rishabh-pant",
  "rr pant": "rishabh-pant",
  "pooran": "nicholas-pooran",
  "nicholas pooran": "nicholas-pooran",
  "n pooran": "nicholas-pooran",
  "mayank yadav": "mayank-yadav",
  "shami": "mohammed-shami",
  "mohammed shami": "mohammed-shami",
  
  // Delhi Capitals
  "kl rahul": "kl-rahul",
  "axar": "axar-patel",
  "axar patel": "axar-patel",
  "ar patel": "axar-patel",
  "kuldeep": "kuldeep-yadav",
  "kuldeep yadav": "kuldeep-yadav",
  "starc": "mitchell-starc",
  "mitchell starc": "mitchell-starc",
  "ma starc": "mitchell-starc",
  "natarajan": "t-natarajan",
  "t natarajan": "t-natarajan",
  
  // Punjab Kings
  "shashank": "shashank-singh",
  "shashank singh": "shashank-singh",
  "shreyas": "shreyas-iyer",
  "shreyas iyer": "shreyas-iyer",
  "ss iyer": "shreyas-iyer",
  "arshdeep": "arshdeep-singh",
  "arshdeep singh": "arshdeep-singh",
  "chahal": "yuzvendra-chahal",
  "yuzvendra chahal": "yuzvendra-chahal",
  "ys chahal": "yuzvendra-chahal",
};

export function resolvePlayerKey(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");
  if (PLAYER_NAME_ALIASES[clean]) return PLAYER_NAME_ALIASES[clean];
  const hyphenated = clean.replace(/\s+/g, "-");
  if (KNOWN_PLAYERS[hyphenated]) return hyphenated;

  for (const [alias, key] of Object.entries(PLAYER_NAME_ALIASES)) {
    if (clean === alias || clean.endsWith(" " + alias) || clean.startsWith(alias + " ")) {
      return key;
    }
  }
  return null;
}
export const FRANCHISE_PERFORMANCE_METRICS: Record<
  string,
  {
    homeVenue: string;
    homeWinRate: string;
    powerplayRunRate: string;
    powerplayBoundaryRate: string;
    deathEconomy: string;
    phaseRank: string;
    retentionSummary: string;
    auctionSpend: string;
  }
> = {
  RCB: {
    homeVenue: "M. Chinnaswamy Stadium",
    homeWinRate: "48.9%",
    powerplayRunRate: "9.99 RPO",
    powerplayBoundaryRate: "24.1%",
    deathEconomy: "11.45 RPO",
    phaseRank: "#2 Powerplay Batting",
    retentionSummary: "3 Core Retained (Kohli, Patidar, Dayal)",
    auctionSpend: "₹83.0 Cr Available Purse",
  },
  CSK: {
    homeVenue: "M.A. Chidambaram Stadium",
    homeWinRate: "71.2%",
    powerplayRunRate: "8.75 RPO",
    powerplayBoundaryRate: "20.8%",
    deathEconomy: "9.85 RPO",
    phaseRank: "#1 Spin Squeeze Rate",
    retentionSummary: "5 Retained (Ruturaj, Jadeja, Dhoni, Dube, Pathirana)",
    auctionSpend: "₹55.0 Cr Available Purse",
  },
  MI: {
    homeVenue: "Wankhede Stadium",
    homeWinRate: "60.8%",
    powerplayRunRate: "9.42 RPO",
    powerplayBoundaryRate: "22.6%",
    deathEconomy: "10.20 RPO",
    phaseRank: "#1 Death Pace Control",
    retentionSummary: "5 Retained (Bumrah, Surya, Hardik, Rohit, Tilak)",
    auctionSpend: "₹45.0 Cr Available Purse",
  },
  KKR: {
    homeVenue: "Eden Gardens",
    homeWinRate: "61.5%",
    powerplayRunRate: "10.85 RPO",
    powerplayBoundaryRate: "26.4%",
    deathEconomy: "9.95 RPO",
    phaseRank: "#1 Enforcer Phase Velocity",
    retentionSummary: "6 Retained (Rinku, Varun, Narine, Russell, Harshit, Ramandeep)",
    auctionSpend: "₹51.0 Cr Available Purse",
  },
  SRH: {
    homeVenue: "Rajiv Gandhi Intl Stadium",
    homeWinRate: "54.2%",
    powerplayRunRate: "11.40 RPO",
    powerplayBoundaryRate: "28.5%",
    deathEconomy: "11.10 RPO",
    phaseRank: "#1 All-Time Powerplay SR",
    retentionSummary: "5 Retained (Klaasen, Cummins, Abhishek, Head, Nitish)",
    auctionSpend: "₹45.0 Cr Available Purse",
  },
  RR: {
    homeVenue: "Sawai Mansingh Stadium",
    homeWinRate: "63.3%",
    powerplayRunRate: "9.20 RPO",
    powerplayBoundaryRate: "21.9%",
    deathEconomy: "10.40 RPO",
    phaseRank: "#2 Defensive Floor",
    retentionSummary: "6 Retained (Samson, Jaiswal, Parag, Jurel, Hetmyer, Sandeep)",
    auctionSpend: "₹41.0 Cr Available Purse",
  },
  DC: {
    homeVenue: "Arun Jaitley Stadium",
    homeWinRate: "45.8%",
    powerplayRunRate: "9.60 RPO",
    powerplayBoundaryRate: "23.2%",
    deathEconomy: "11.30 RPO",
    phaseRank: "#4 Powerplay Tempo",
    retentionSummary: "4 Retained (Axar, Kuldeep, Stubbs, Abishek)",
    auctionSpend: "₹73.0 Cr Available Purse",
  },
  PBKS: {
    homeVenue: "PCA Stadium, Mullanpur",
    homeWinRate: "42.9%",
    powerplayRunRate: "9.10 RPO",
    powerplayBoundaryRate: "21.5%",
    deathEconomy: "11.60 RPO",
    phaseRank: "#3 Death Overs Strike Rate",
    retentionSummary: "2 Retained (Shashank, Prabhsimran)",
    auctionSpend: "₹110.5 Cr Available Purse",
  },
  GT: {
    homeVenue: "Narendra Modi Stadium",
    homeWinRate: "58.3%",
    powerplayRunRate: "8.95 RPO",
    powerplayBoundaryRate: "20.4%",
    deathEconomy: "10.15 RPO",
    phaseRank: "#3 Middle Overs Control",
    retentionSummary: "5 Retained (Gill, Rashid, Sai Sudharsan, Tewatia, Shahrukh)",
    auctionSpend: "₹69.0 Cr Available Purse",
  },
  LSG: {
    homeVenue: "BRSABV Ekana Stadium",
    homeWinRate: "52.9%",
    powerplayRunRate: "8.60 RPO",
    powerplayBoundaryRate: "19.8%",
    deathEconomy: "10.50 RPO",
    phaseRank: "#2 Spin Economy at Home",
    retentionSummary: "5 Retained (Pooran, Mayank, Bishnoi, Badoni, Mohsin)",
    auctionSpend: "₹69.0 Cr Available Purse",
  },
};

/** Module 1: Article Intelligence Snapshot */
export function ArticleIntelligenceSnapshot({
  article,
  evidence,
  entry,
  accent,
  metricsCount,
}: {
  article: LoadedArticle["article"];
  evidence: LoadedArticle["evidence"];
  entry: IndexEntry;
  accent: string;
  metricsCount: number;
}) {
  const dateFormatted = new Date(`${article.publishedDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#101F2D] p-4 text-slate-800 dark:text-[#EFF5F7] shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A4050] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-[#B6E95C]">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Intelligence Snapshot</span>
        </div>
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest border"
          style={{
            borderColor: `${accent}40`,
            backgroundColor: `${accent}15`,
            color: accent,
          }}
        >
          {entry.franchise} DOSSIER
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C] p-2.5">
          <div className="text-lg font-black font-mono text-emerald-700 dark:text-[#B6E95C]">{metricsCount}</div>
          <div className="text-[10px] font-mono text-slate-600 dark:text-[#8A9EA8] mt-0.5">Metrics Verified</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C] p-2.5">
          <div className="text-lg font-black font-mono text-amber-700 dark:text-[#FF982E]">{article.keyTakeaways.length}</div>
          <div className="text-[10px] font-mono text-slate-600 dark:text-[#8A9EA8] mt-0.5">Key Claims Tested</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C] p-2.5">
          <div className="text-lg font-black font-mono text-cyan-700 dark:text-[#4AC9D8]">{entry.readMinutes} min</div>
          <div className="text-[10px] font-mono text-slate-600 dark:text-[#8A9EA8] mt-0.5">Reading Time</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C] p-2.5">
          <div className="text-lg font-black font-mono text-slate-900 dark:text-[#EFF5F7]">{article.sources.length}</div>
          <div className="text-[10px] font-mono text-slate-600 dark:text-[#8A9EA8] mt-0.5">Data Sources</div>
        </div>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-[#2A4050] text-xs">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-600 dark:text-[#8A9EA8] font-medium">Author:</span>
          <span className="font-semibold text-slate-900 dark:text-[#EFF5F7]">{article.author}</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-600 dark:text-[#8A9EA8] font-medium">Published:</span>
          <span className="font-mono text-slate-700 dark:text-[#8A9EA8]">{dateFormatted}</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-600 dark:text-[#8A9EA8] font-medium">Dataset Sample:</span>
          <span className="font-mono font-bold text-cyan-700 dark:text-[#4AC9D8]">
            {evidence.database.matches.toLocaleString("en-IN")} matches
          </span>
        </div>
      </div>
    </div>
  );
}

/** Module 2: On This Page Navigation */
export function OnThisPageNav({
  sections,
  accent,
  activeId,
}: {
  sections: LoadedArticle["article"]["sections"];
  accent: string;
  activeId: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#101F2D] p-4 text-slate-800 dark:text-[#EFF5F7] shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A4050] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-[#EFF5F7]">
          <Compass className="h-3.5 w-3.5 text-cyan-600 dark:text-[#4AC9D8]" />
          <span>On This Page</span>
        </div>
        <span className="text-[9px] font-mono text-slate-500 dark:text-[#8A9EA8]">INTERACTIVE TOC</span>
      </div>

      <ol className="space-y-1.5 text-xs">
        <li>
          <a
            href="#takeaways"
            className={`flex items-center gap-2 rounded px-2 py-1 transition ${
              activeId === "takeaways"
                ? "bg-slate-100 dark:bg-[#192D3C] text-slate-950 dark:text-white font-semibold"
                : "text-slate-600 dark:text-[#8A9EA8] hover:text-slate-950 dark:hover:text-[#EFF5F7] hover:bg-slate-50 dark:hover:bg-[#192D3C]/50"
            }`}
          >
            <span className="font-mono text-[10px] text-emerald-700 dark:text-[#B6E95C]">00</span>
            <span className="truncate">Key Takeaways</span>
          </a>
        </li>
        {sections.map((s, idx) => {
          const isActive = activeId === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`flex items-center gap-2 rounded px-2 py-1 transition ${
                  isActive
                    ? "bg-slate-100 dark:bg-[#192D3C] text-slate-950 dark:text-white font-semibold"
                    : "text-slate-600 dark:text-[#8A9EA8] hover:text-slate-950 dark:hover:text-[#EFF5F7] hover:bg-slate-50 dark:hover:bg-[#192D3C]/50"
                }`}
              >
                <span
                  className="font-mono text-[10px]"
                  style={{ color: isActive ? accent : undefined }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="truncate leading-snug">{s.heading}</span>
              </a>
            </li>
          );
        })}
        <li>
          <a
            href="#method"
            className={`flex items-center gap-2 rounded px-2 py-1 transition ${
              activeId === "method"
                ? "bg-slate-100 dark:bg-[#192D3C] text-slate-950 dark:text-white font-semibold"
                : "text-slate-600 dark:text-[#8A9EA8] hover:text-slate-950 dark:hover:text-[#EFF5F7] hover:bg-slate-50 dark:hover:bg-[#192D3C]/50"
            }`}
          >
            <span className="font-mono text-[10px] text-cyan-700 dark:text-[#4AC9D8]">06</span>
            <span className="truncate">Data & Methodology</span>
          </a>
        </li>
      </ol>
    </div>
  );
}

/** Module 3: Franchise Performance Snapshot */
export function FranchisePerformanceSnapshot({
  franchiseCode,
  accent,
}: {
  franchiseCode: string;
  accent: string;
}) {
  const metrics = FRANCHISE_PERFORMANCE_METRICS[franchiseCode] || FRANCHISE_PERFORMANCE_METRICS["RCB"];
  const franchiseMeta = FRANCHISE_METADATA[franchiseCode];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#101F2D] p-4 text-slate-800 dark:text-[#EFF5F7] shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A4050] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-[#EFF5F7]">
          <Activity className="h-3.5 w-3.5" style={{ color: accent }} />
          <span>{franchiseCode} Performance Snapshot</span>
        </div>
        <span className="text-[9px] font-mono text-slate-500 dark:text-[#8A9EA8]">WAREHOUSE DATA</span>
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="rounded-lg bg-slate-50 dark:bg-[#192D3C] p-2.5 border border-slate-200 dark:border-[#2A4050]">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[10px] text-slate-600 dark:text-[#8A9EA8] uppercase font-mono">Home Venue</span>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-[#B6E95C]">{metrics.homeWinRate} Win%</span>
          </div>
          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{metrics.homeVenue}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 dark:bg-[#192D3C] p-2 border border-slate-200 dark:border-[#2A4050]">
            <span className="text-[9px] text-slate-600 dark:text-[#8A9EA8] uppercase font-mono block">Powerplay Tempo</span>
            <span className="text-sm font-mono font-bold text-amber-700 dark:text-[#FF982E] mt-0.5 block">{metrics.powerplayRunRate}</span>
            <span className="text-[9px] text-slate-600 dark:text-[#8A9EA8] font-mono">{metrics.powerplayBoundaryRate} boundary</span>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-[#192D3C] p-2 border border-slate-200 dark:border-[#2A4050]">
            <span className="text-[9px] text-slate-600 dark:text-[#8A9EA8] uppercase font-mono block">Death Economy</span>
            <span className="text-sm font-mono font-bold text-cyan-700 dark:text-[#4AC9D8] mt-0.5 block">{metrics.deathEconomy}</span>
            <span className="text-[9px] text-slate-600 dark:text-[#8A9EA8] font-mono">Overs 17–20</span>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-[#192D3C] p-2.5 border border-slate-200 dark:border-[#2A4050] space-y-1">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-slate-600 dark:text-[#8A9EA8] uppercase">Phase Rank</span>
            <span className="font-bold text-emerald-700 dark:text-[#B6E95C]">{metrics.phaseRank}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-slate-600 dark:text-[#8A9EA8] uppercase">Squad Status</span>
            <span className="text-slate-900 dark:text-white truncate max-w-[170px]">{metrics.retentionSummary}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono pt-1 border-t border-slate-200 dark:border-[#2A4050]/50">
            <span className="text-slate-600 dark:text-[#8A9EA8] uppercase">Purse</span>
            <span className="font-bold text-amber-700 dark:text-[#FF982E]">{metrics.auctionSpend}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Module 4: Players in This Story */
export function PlayersInThisStory({
  article,
  franchiseCode,
  accent,
}: {
  article: LoadedArticle["article"];
  franchiseCode: string;
  accent: string;
}) {
  const resolvedKeys = new Set<string>();

  // 1. Resolve explicitly from article.players array (frontmatter / props)
  if (Array.isArray(article.players)) {
    for (const raw of article.players) {
      const key = resolvePlayerKey(raw);
      if (key && KNOWN_PLAYERS[key]) {
        resolvedKeys.add(key);
      }
    }
  }

  // 2. Scan article narrative text (title, dek, takeaways, headings, body) if fewer than 3
  if (resolvedKeys.size < 3) {
    const fullText = `${article.title} ${article.dek || ""} ${article.keyTakeaways?.join(" ") || ""} ${article.sections?.map((s) => s.heading + " " + s.body.join(" ")).join(" ") || ""}`.toLowerCase();
    for (const [key, player] of Object.entries(KNOWN_PLAYERS)) {
      const lastName = player.name.split(" ").slice(-1)[0].toLowerCase();
      const firstName = player.name.split(" ")[0].toLowerCase();
      if (fullText.includes(lastName) || (firstName.length > 3 && fullText.includes(firstName))) {
        resolvedKeys.add(key);
        if (resolvedKeys.size >= 3) break;
      }
    }
  }

  // 3. Fallback to franchise marquee roster if still fewer than 3
  if (resolvedKeys.size < 3) {
    const franchiseDefaults: Record<string, string[]> = {
      MI: ["jasprit-bumrah", "rohit-sharma", "suryakumar-yadav", "hardik-pandya", "tilak-varma"],
      CSK: ["ms-dhoni", "ruturaj-gaikwad", "sanju-samson", "shivam-dube"],
      RCB: ["virat-kohli", "rajat-patidar", "bhuvneshwar-kumar", "yash-dayal", "phil-salt"],
      SRH: ["pat-cummins", "travis-head", "abhishek-sharma", "heinrich-klaasen", "nitish-kumar-reddy"],
      KKR: ["sunil-narine", "rinku-singh", "varun-chakravarthy", "ajinkya-rahane"],
      RR: ["yashasvi-jaiswal", "ravindra-jadeja", "jofra-archer", "riyan-parag"],
      GT: ["shubman-gill", "jos-buttler", "rashid-khan", "mohammed-siraj"],
      LSG: ["rishabh-pant", "nicholas-pooran", "mayank-yadav", "mohammed-shami"],
      DC: ["kl-rahul", "axar-patel", "kuldeep-yadav", "mitchell-starc", "t-natarajan"],
      PBKS: ["shashank-singh", "shreyas-iyer", "arshdeep-singh", "yuzvendra-chahal"],
    };
    const defaults = franchiseDefaults[franchiseCode] || franchiseDefaults["MI"];
    for (const k of defaults) {
      resolvedKeys.add(k);
      if (resolvedKeys.size >= 3) break;
    }
  }

  const finalPlayers = Array.from(resolvedKeys)
    .map((k) => KNOWN_PLAYERS[k])
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#101F2D] p-4 text-slate-800 dark:text-[#EFF5F7] shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A4050] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-[#EFF5F7]">
          <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-[#B6E95C]" />
          <span>Players in This Story</span>
        </div>
        <span className="text-[9px] font-mono text-slate-500 dark:text-[#8A9EA8]">ROSTER TELEMETRY</span>
      </div>

      <div className="space-y-2.5">
        {finalPlayers.map((player) => (
          <Link
            key={player.slug}
            href={`/players/${player.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C] p-2.5 hover:border-emerald-500/40 dark:hover:border-[#B6E95C]/40 hover:bg-slate-100 dark:hover:bg-[#192D3C]/90 transition"
          >
            {/* Dedicated DP with explicit fit and dimensions */}
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-300 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-900">
              <img
                src={player.image}
                alt={player.name}
                className="h-full w-full object-cover object-top"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/avatars/fallback/default-player.webp";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#B6E95C] transition truncate">
                  {player.name}
                </h5>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#08131F] text-slate-600 dark:text-[#8A9EA8] border border-slate-200 dark:border-[#2A4050]">
                  {player.teamCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#8A9EA8] truncate">{player.role}</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400/90 font-mono mt-0.5 truncate">{player.iplStatsSummary}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PhaseTacticalComparison({
  franchiseCode,
  accent,
}: {
  franchiseCode: string;
  accent: string;
}) {
  const isRcb = franchiseCode === "RCB";
  const isSrh = franchiseCode === "SRH";
  const isKkr = franchiseCode === "KKR";

  const rows = [
    {
      metric: "Powerplay Run Rate",
      teamVal: isSrh ? "11.40" : isKkr ? "10.85" : isRcb ? "9.99" : "9.20",
      leagueAvg: "8.64",
      diff: isSrh ? "+2.76" : isKkr ? "+2.21" : isRcb ? "+1.35" : "+0.56",
      isPositive: true,
    },
    {
      metric: "Dot-Ball Ratio (Overs 1–6)",
      teamVal: isRcb ? "32.6%" : isSrh ? "30.4%" : "34.2%",
      leagueAvg: "37.8%",
      diff: isRcb ? "-5.2%" : isSrh ? "-7.4%" : "-3.6%",
      isPositive: true,
    },
    {
      metric: "Boundary Frequency",
      teamVal: isSrh ? "28.5%" : isKkr ? "26.4%" : isRcb ? "24.1%" : "21.9%",
      leagueAvg: "20.1%",
      diff: isSrh ? "+8.4%" : isKkr ? "+6.3%" : isRcb ? "+4.0%" : "+1.8%",
      isPositive: true,
    },
    {
      metric: "Wicket Penalty Shift (PP)",
      teamVal: "2+ down: 41.2%",
      leagueAvg: "42.5%",
      diff: "-1.3%",
      isPositive: false,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#101F2D] p-4 text-slate-800 dark:text-[#EFF5F7] shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A4050] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-[#EFF5F7]">
          <BarChart2 className="h-3.5 w-3.5 text-amber-600 dark:text-[#FF982E]" />
          <span>Phase & Tactical Benchmark</span>
        </div>
        <span className="text-[9px] font-mono text-slate-500 dark:text-[#8A9EA8]">VS LEAGUE AVG</span>
      </div>

      <div className="space-y-2 text-xs">
        {rows.map((r, i) => (
          <div key={i} className="rounded-lg bg-slate-50 dark:bg-[#192D3C] p-2 border border-slate-200 dark:border-[#2A4050]">
            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-[#8A9EA8] font-mono mb-1">
              <span>{r.metric}</span>
              <span className={r.isPositive ? "text-emerald-700 dark:text-[#B6E95C] font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>
                {r.diff}
              </span>
            </div>
            <div className="flex justify-between items-baseline font-mono">
              <span className="text-sm font-black text-slate-900 dark:text-white">{r.teamVal}</span>
              <span className="text-[10px] text-slate-500 dark:text-[#8A9EA8]">Avg: {r.leagueAvg}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Module 6: Explore the Underlying Data */
export function ExploreUnderlyingData({
  franchiseCode,
  accent,
  articleTitle,
}: {
  franchiseCode: string;
  accent: string;
  articleTitle: string;
}) {
  const links = [
    {
      title: "Franchise Intelligence Hub",
      desc: `Full tactical telemetry & dossiers for ${franchiseCode}`,
      href: `/intelligence?franchise=${franchiseCode.toLowerCase()}`,
      badge: "DATASET",
    },
    {
      title: "Ball-by-Ball Warehouse",
      desc: "Query 2,468 match records & delivery logs",
      href: "/scores",
      badge: "RAW ARCHIVE",
    },
    {
      title: "Matchups & Bowling Matrix",
      desc: "Head-to-head batter vs bowler telemetry",
      href: "/analytics",
      badge: "EXPLORER",
    },
    {
      title: "Interactive Scout Lab",
      desc: "Simulate tactics against the Cricsheet model",
      href: `/scout?q=${encodeURIComponent(articleTitle)}`,
      badge: "LAB",
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#101F2D] p-4 text-slate-800 dark:text-[#EFF5F7] shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A4050] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-[#EFF5F7]">
          <Database className="h-3.5 w-3.5 text-cyan-600 dark:text-[#4AC9D8]" />
          <span>Explore Underlying Data</span>
        </div>
        <span className="text-[9px] font-mono text-cyan-600 dark:text-[#4AC9D8]">TOOLS</span>
      </div>

      <div className="space-y-2">
        {links.map((link, idx) => (
          <Link
            key={idx}
            href={link.href}
            className="group flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C] p-2.5 hover:border-cyan-500/50 dark:hover:border-[#4AC9D8]/50 hover:bg-slate-100 dark:hover:bg-[#192D3C]/80 transition"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-[#4AC9D8] transition truncate">
                  {link.title}
                </span>
                <span className="rounded bg-slate-100 dark:bg-[#08131F] px-1 py-0.5 text-[8px] font-mono font-bold uppercase text-slate-500 dark:text-[#8A9EA8]">
                  {link.badge}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-[#8A9EA8] truncate">{link.desc}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-[#8A9EA8] mt-1 group-hover:text-cyan-600 dark:group-hover:text-[#4AC9D8] group-hover:translate-x-0.5 transition" />
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Module 7: Related Intelligence Articles */
export function RelatedIntelligenceArticles({
  related,
  accent,
}: {
  related: Array<{ plan?: PlanEntry; live?: IndexEntry }>;
  accent: string;
}) {
  if (!related || related.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#101F2D] p-4 text-slate-800 dark:text-[#EFF5F7] shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A4050] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-[#EFF5F7]">
          <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-[#B6E95C]" />
          <span>Related Intelligence</span>
        </div>
        <span className="text-[9px] font-mono text-slate-500 dark:text-[#8A9EA8]">CURATED</span>
      </div>

      <ul className="space-y-2.5">
        {related.map(({ plan: p, live }) => {
          if (!p) return null;
          return live ? (
            <li key={p.planId}>
              <Link
                href={`/dugout/articles/${live.slug}`}
                className="group block rounded-lg border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C] p-2.5 hover:border-emerald-500/40 dark:hover:border-[#B6E95C]/40 hover:bg-slate-100 dark:hover:bg-[#192D3C]/80 transition"
              >
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 dark:text-[#8A9EA8] mb-1">
                  <span className="uppercase">{live.franchise}</span>
                  <span>{live.readMinutes} min read</span>
                </div>
                <h5 className="text-xs font-bold leading-snug text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#B6E95C] transition line-clamp-2">
                  {p.title}
                </h5>
              </Link>
            </li>
          ) : (
            <li key={p.planId} className="rounded-lg border border-slate-200 dark:border-[#2A4050]/50 bg-slate-50 dark:bg-[#192D3C]/40 p-2.5 text-xs text-slate-500 dark:text-[#8A9EA8]">
              <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                <span>PLANNED DOSSIER</span>
                <span className="text-[8px] border border-slate-200 dark:border-[#2A4050] px-1 rounded">IN QUEUE</span>
              </div>
              <div className="line-clamp-2 text-slate-600 dark:text-slate-400">{p.title}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Module 8: More From This Franchise */
export function MoreFromFranchise({
  franchiseCode,
  franchiseArticles,
  accent,
}: {
  franchiseCode: string;
  franchiseArticles: IndexEntry[];
  accent: string;
}) {
  const meta = FRANCHISE_METADATA[franchiseCode] ?? { name: franchiseCode, accent: "#F03C3C" };
  const publishedCount = franchiseArticles.filter((a) => a.status === "published").length;
  const totalCount = franchiseArticles.length;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#2A4050] bg-white dark:bg-[#101F2D] p-4 text-slate-800 dark:text-[#EFF5F7] shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A4050] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-[#EFF5F7]">
          <Shield className="h-3.5 w-3.5" style={{ color: accent }} />
          <span>More From {franchiseCode}</span>
        </div>
        <span className="text-[9px] font-mono text-slate-500 dark:text-[#8A9EA8]">
          {publishedCount}/{totalCount} PUBLISHED
        </span>
      </div>

      <div className="mb-3 space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-[#8A9EA8]">
          <span>Dossier Archive Progress</span>
          <span>{Math.round((publishedCount / Math.max(totalCount, 1)) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#192D3C]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round((publishedCount / Math.max(totalCount, 1)) * 100)}%`,
              backgroundColor: accent,
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {franchiseArticles.slice(0, 4).map((art) => (
          <Link
            key={art.id}
            href={`/dugout/articles/${art.slug}`}
            className="group flex items-start justify-between gap-2 rounded-lg border border-slate-200 dark:border-[#2A4050] bg-slate-50 dark:bg-[#192D3C] p-2 hover:border-slate-300 dark:hover:border-white/20 transition"
          >
            <span className="text-xs font-medium text-slate-700 dark:text-[#8A9EA8] group-hover:text-slate-900 dark:group-hover:text-white line-clamp-1">
              {art.title}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-[#8A9EA8] group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition" />
          </Link>
        ))}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-[#2A4050] text-center">
        <Link
          href={`/dugout/${franchiseCode.toLowerCase()}`}
          className="inline-flex items-center gap-1 text-[11px] font-mono font-bold hover:underline"
          style={{ color: accent }}
        >
          <span>View all {meta.name} intel</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

/** Complete Full-Height Editorial Sidebar populated from top to bottom */
export function EditorialFullSidebar({
  article,
  evidence,
  entry,
  accent,
  metricsCount,
  related,
  franchiseArticles,
  activeSectionId,
}: {
  article: LoadedArticle["article"];
  evidence: LoadedArticle["evidence"];
  entry: IndexEntry;
  accent: string;
  metricsCount: number;
  related: Array<{ plan?: PlanEntry; live?: IndexEntry }>;
  franchiseArticles: IndexEntry[];
  activeSectionId: string;
}) {
  return (
    <aside className="space-y-6">
      {/* 1. Article Intelligence Snapshot */}
      <ArticleIntelligenceSnapshot
        article={article}
        evidence={evidence}
        entry={entry}
        accent={accent}
        metricsCount={metricsCount}
      />

      {/* 2. On This Page Navigation */}
      <div>
        <OnThisPageNav
          sections={article.sections}
          accent={accent}
          activeId={activeSectionId}
        />
      </div>

      {/* 3. Franchise Performance Snapshot */}
      <FranchisePerformanceSnapshot
        franchiseCode={entry.franchise}
        accent={accent}
      />

      {/* 4. Players in This Story */}
      <PlayersInThisStory
        article={article}
        franchiseCode={entry.franchise}
        accent={accent}
      />

      {/* 5. Phase and Tactical Comparison */}
      <PhaseTacticalComparison
        franchiseCode={entry.franchise}
        accent={accent}
      />

      {/* 6. Explore the Underlying Data */}
      <ExploreUnderlyingData
        franchiseCode={entry.franchise}
        accent={accent}
        articleTitle={article.title}
      />

      {/* 7. Related Intelligence Articles */}
      <RelatedIntelligenceArticles
        related={related}
        accent={accent}
      />

      {/* 8. More From This Franchise */}
      <MoreFromFranchise
        franchiseCode={entry.franchise}
        franchiseArticles={franchiseArticles}
        accent={accent}
      />
    </aside>
  );
}
