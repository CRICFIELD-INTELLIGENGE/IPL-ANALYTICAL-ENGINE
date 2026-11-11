import NotFound from "@/pages/not-found";
import React, { useMemo, useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import {
  ArrowLeft, Clock, Share2, Bookmark, Check,
  Type, BookOpen, ExternalLink, ChevronRight, Award, Trophy,
  TrendingUp, Flame, Shield, ArrowUpRight, BarChart2, Radio,
  Send, Sparkles, CheckCircle2, ShieldCheck, ArrowRight
} from "lucide-react";
import {
  getEditorialArticleBySlug,
  EDITORIAL_ARTICLES,
  EditorialArticle,
  FRANCHISE_METADATA,
} from "@/data/editorial-magazine-data";
import { TEAM_REGISTRY, isTeamCode } from "@/lib/team-context";
import { AdVessel } from "@/components/ad-vessel";
import { EditorialCoverCanvas } from "@/components/dugout/editorial-cover-canvas";
import { EditorialImageFigure } from "@/components/dugout/editorial-image-figure";
import { getLocalEmbedImages, getPublishedArticleImages } from "@/lib/editorial-images";
import type { EditorialSectionId } from "@/data/editorial-images/types";
import { findV2BySlug } from "@/lib/editorial-v2";
import { GettyPhotoNotice } from "@/components/dugout/getty-photo-notice";
import { SponsorModule } from "@/components/photo-policy";
import { ArticleV2View } from "@/components/dugout/article-v2/article-v2-view";

type FontSize = "normal" | "large" | "xl";

export interface MappedPlayerBio {
  key: string;
  slug: string;
  name: string;
  fullName: string;
  role: string;
  team: string;
  teamCode: string;
  batStyle: string;
  bowlStyle: string;
  country: string;
  age: number | string;
  image: string;
  accent: string;
  jerseyNo?: string;
  iplStatsSummary?: string;
}

// Canonical curated dictionary of key IPL players featured in editorial articles
const CURATED_PLAYERS: Record<string, MappedPlayerBio> = {
  "jasprit-bumrah": {
    key: "jasprit-bumrah",
    slug: "jasprit-bumrah",
    name: "Jasprit Bumrah",
    fullName: "Jasprit Jasbirsingh Bumrah",
    role: "Fast Bowler",
    team: "Mumbai Indians",
    teamCode: "MI",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm fast",
    country: "India",
    age: 31,
    image: "/players/mi-2026/jasprit-bumrah.webp",
    accent: "#3377ff",
    jerseyNo: "93",
    iplStatsSummary: "165 wkts • 7.30 econ • Premier T20 Pacer",
  },
  "rohit-sharma": {
    key: "rohit-sharma",
    slug: "rohit-sharma",
    name: "Rohit Sharma",
    fullName: "Rohit Gurunath Sharma",
    role: "Opening Batter",
    team: "Mumbai Indians",
    teamCode: "MI",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm offbreak",
    country: "India",
    age: 37,
    image: "/players/mi-2026/rohit-sharma.webp",
    accent: "#3377ff",
    jerseyNo: "45",
    iplStatsSummary: "6,628 runs • 131.14 SR • 5x IPL Champion",
  },
  "suryakumar-yadav": {
    key: "suryakumar-yadav",
    slug: "suryakumar-yadav",
    name: "Suryakumar Yadav",
    fullName: "Suryakumar Ashok Yadav",
    role: "T20 Specialist",
    team: "Mumbai Indians",
    teamCode: "MI",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm medium",
    country: "India",
    age: 34,
    image: "/players/mi-2026/suryakumar-yadav.webp",
    accent: "#3377ff",
    jerseyNo: "63",
    iplStatsSummary: "3,594 runs • 145.32 SR • 102* (2024)",
  },
  "hardik-pandya": {
    key: "hardik-pandya",
    slug: "hardik-pandya",
    name: "Hardik Pandya",
    fullName: "Hardik Himanshu Pandya",
    role: "Captain & All-Rounder",
    team: "Mumbai Indians",
    teamCode: "MI",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm fast-medium",
    country: "India",
    age: 31,
    image: "/players/mi-2026/hardik-pandya.webp",
    accent: "#3377ff",
    jerseyNo: "33",
    iplStatsSummary: "2,525 runs • 145.87 SR • 64 wkts",
  },
  "pat-cummins": {
    key: "pat-cummins",
    slug: "pat-cummins",
    name: "Pat Cummins",
    fullName: "Patrick James Cummins",
    role: "Captain & Fast Bowler",
    team: "Sunrisers Hyderabad",
    teamCode: "SRH",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm fast",
    country: "Australia",
    age: 31,
    image: "/players/srh-2026/pat-cummins.webp",
    accent: "#f97316",
    jerseyNo: "30",
    iplStatsSummary: "18 wkts • 8.98 econ (2024)",
  },
  "travis-head": {
    key: "travis-head",
    slug: "travis-head",
    name: "Travis Head",
    fullName: "Travis Michael Head",
    role: "Opening Batter",
    team: "Sunrisers Hyderabad",
    teamCode: "SRH",
    batStyle: "Left-hand bat",
    bowlStyle: "Right-arm offbreak",
    country: "Australia",
    age: 31,
    image: "/players/srh-2026/travis-head.webp",
    accent: "#f97316",
    jerseyNo: "62",
    iplStatsSummary: "567 runs • 191.55 SR (2024)",
  },
  "abhishek-sharma": {
    key: "abhishek-sharma",
    slug: "abhishek-sharma",
    name: "Abhishek Sharma",
    fullName: "Abhishek Sharma",
    role: "Opening All-Rounder",
    team: "Sunrisers Hyderabad",
    teamCode: "SRH",
    batStyle: "Left-hand bat",
    bowlStyle: "Slow left-arm orthodox",
    country: "India",
    age: 24,
    image: "/players/srh-2026/abhishek-sharma.webp",
    accent: "#f97316",
    jerseyNo: "4",
    iplStatsSummary: "484 runs • 204.21 SR • 42 sixes",
  },
  "heinrich-klaasen": {
    key: "heinrich-klaasen",
    slug: "heinrich-klaasen",
    name: "Heinrich Klaasen",
    fullName: "Heinrich Klaasen",
    role: "Wicketkeeper-Batter",
    team: "Sunrisers Hyderabad",
    teamCode: "SRH",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm offbreak",
    country: "South Africa",
    age: 33,
    image: "/players/srh-2026/heinrich-klaasen.webp",
    accent: "#f97316",
    jerseyNo: "45",
    iplStatsSummary: "479 runs • 171.07 SR (2024)",
  },
  "bhuvneshwar-kumar": {
    key: "bhuvneshwar-kumar",
    slug: "bhuvneshwar-kumar",
    name: "Bhuvneshwar Kumar",
    fullName: "Bhuvneshwar Kumar",
    role: "Seam Bowler",
    team: "Royal Challengers Bengaluru",
    teamCode: "RCB",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm medium fast",
    country: "India",
    age: 35,
    image: "/players/rcb-2026/bhuvneshwar-kumar.webp",
    accent: "#f97316",
    jerseyNo: "15",
    iplStatsSummary: "181 IPL career wkts • 7.56 econ",
  },
  "virat-kohli": {
    key: "virat-kohli",
    slug: "virat-kohli",
    name: "Virat Kohli",
    fullName: "Virat Kohli",
    role: "Top-order Batter",
    team: "Royal Challengers Bengaluru",
    teamCode: "RCB",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm medium",
    country: "India",
    age: 36,
    image: "/players/rcb-2026/virat-kohli.webp",
    accent: "#dc2626",
    jerseyNo: "18",
    iplStatsSummary: "741 runs • 154.69 SR • Orange Cap 2024",
  },
  "yash-dayal": {
    key: "yash-dayal",
    slug: "yash-dayal",
    name: "Yash Dayal",
    fullName: "Yash Dayal",
    role: "Left-arm Fast Bowler",
    team: "Royal Challengers Bengaluru",
    teamCode: "RCB",
    batStyle: "Left-hand bat",
    bowlStyle: "Left-arm fast-medium",
    country: "India",
    age: 27,
    image: "/players/rcb-2026/yash-dayal.webp",
    accent: "#dc2626",
    jerseyNo: "103",
    iplStatsSummary: "15 wkts • Defended 17 runs vs CSK 20th over",
  },
  "ms-dhoni": {
    key: "ms-dhoni",
    slug: "ms-dhoni",
    name: "MS Dhoni",
    fullName: "Mahendra Singh Dhoni",
    role: "Wicketkeeper-Batter",
    team: "Chennai Super Kings",
    teamCode: "CSK",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm medium",
    country: "India",
    age: 43,
    image: "/players/csk-2026/ms-dhoni.webp",
    accent: "#ffd11a",
    jerseyNo: "7",
    iplStatsSummary: "5,243 runs • 137.53 SR • 5x IPL Champion",
  },
  "ruturaj-gaikwad": {
    key: "ruturaj-gaikwad",
    slug: "ruturaj-gaikwad",
    name: "Ruturaj Gaikwad",
    fullName: "Ruturaj Dashrath Gaikwad",
    role: "Captain & Opening Batter",
    team: "Chennai Super Kings",
    teamCode: "CSK",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm offbreak",
    country: "India",
    age: 28,
    image: "/players/csk-2026/ruturaj-gaikwad.webp",
    accent: "#ffd11a",
    jerseyNo: "31",
    iplStatsSummary: "583 runs • 141.16 SR • 108* High",
  },
  "sunil-narine": {
    key: "sunil-narine",
    slug: "sunil-narine",
    name: "Sunil Narine",
    fullName: "Sunil Philip Narine",
    role: "All-Rounder",
    team: "Kolkata Knight Riders",
    teamCode: "KKR",
    batStyle: "Left-hand bat",
    bowlStyle: "Right-arm offbreak",
    country: "West Indies",
    age: 36,
    image: "/players/kkr-2026/sunil-narine.webp",
    accent: "#b56bef",
    jerseyNo: "74",
    iplStatsSummary: "488 runs • 180.74 SR • 17 wkts (MVP 2024)",
  },
  "sanju-samson": {
    key: "sanju-samson",
    slug: "sanju-samson",
    name: "Sanju Samson",
    fullName: "Sanju Viswanath Samson",
    role: "Captain & Wicketkeeper-Batter",
    team: "Chennai Super Kings",
    teamCode: "CSK",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm offbreak",
    country: "India",
    age: 30,
    image: "/players/csk-2026/sanju-samson.webp",
    accent: "#ffd11a",
    jerseyNo: "11",
    iplStatsSummary: "531 runs • 153.46 SR (2024)",
  },
  "yashasvi-jaiswal": {
    key: "yashasvi-jaiswal",
    slug: "yashasvi-jaiswal",
    name: "Yashasvi Jaiswal",
    fullName: "Yashasvi Bhupendra Kumar Jaiswal",
    role: "Opening Batter",
    team: "Rajasthan Royals",
    teamCode: "RR",
    batStyle: "Left-hand bat",
    bowlStyle: "Right-arm legbreak",
    country: "India",
    age: 23,
    image: "/players/rr-2026/yashasvi-jaiswal.webp",
    accent: "#e8308c",
    jerseyNo: "19",
    iplStatsSummary: "435 runs • 155.91 SR • 104* (2024)",
  },
  "rishabh-pant": {
    key: "rishabh-pant",
    slug: "rishabh-pant",
    name: "Rishabh Pant",
    fullName: "Rishabh Rajendra Pant",
    role: "Captain & Wicketkeeper-Batter",
    team: "Lucknow Super Giants",
    teamCode: "LSG",
    batStyle: "Left-hand bat",
    bowlStyle: "Right-arm medium",
    country: "India",
    age: 27,
    image: "/players/lsg-2026/rishabh-pant.webp",
    accent: "#22d3ee",
    jerseyNo: "17",
    iplStatsSummary: "446 runs • 155.40 SR (2024)",
  },
  "shashank-singh": {
    key: "shashank-singh",
    slug: "shashank-singh",
    name: "Shashank Singh",
    fullName: "Shashank Singh",
    role: "Finisher",
    team: "Punjab Kings",
    teamCode: "PBKS",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm medium",
    country: "India",
    age: 33,
    image: "/players/pbks-2026/shashank-singh.webp",
    accent: "#ff5a6e",
    jerseyNo: "27",
    iplStatsSummary: "354 runs • 164.65 SR • 168.4 death SR",
  },
  "shubman-gill": {
    key: "shubman-gill",
    slug: "shubman-gill",
    name: "Shubman Gill",
    fullName: "Shubman Gill",
    role: "Captain & Opening Batter",
    team: "Gujarat Titans",
    teamCode: "GT",
    batStyle: "Right-hand bat",
    bowlStyle: "Right-arm offbreak",
    country: "India",
    age: 25,
    image: "/players/gt-2026/shubman-gill.webp",
    accent: "#34d399",
    jerseyNo: "7",
    iplStatsSummary: "426 runs • 147.40 SR (2024)",
  },
  "nicholas-pooran": {
    key: "nicholas-pooran",
    slug: "nicholas-pooran",
    name: "Nicholas Pooran",
    fullName: "Nicholas Pooran",
    role: "Middle-Overs Finisher / WK",
    team: "Lucknow Super Giants",
    teamCode: "LSG",
    batStyle: "Left-hand bat",
    bowlStyle: "Right-arm offbreak",
    country: "West Indies",
    age: 29,
    image: "/players/lsg-2026/nicholas-pooran.webp",
    accent: "#22d3ee",
    jerseyNo: "29",
    iplStatsSummary: "499 runs • 178.21 SR • 36 sixes (2024)",
  },
};

const PLAYER_NAME_ALIASES: Array<{ regex: RegExp; playerKey: string }> = [
  { regex: /\b(Pat Cummins|Cummins)\b/g, playerKey: "pat-cummins" },
  { regex: /\b(Travis Head|Head)\b/g, playerKey: "travis-head" },
  { regex: /\b(Abhishek Sharma|Abhishek)\b/g, playerKey: "abhishek-sharma" },
  { regex: /\b(Heinrich Klaasen|Klaasen)\b/g, playerKey: "heinrich-klaasen" },
  { regex: /\b(Bhuvneshwar Kumar|Bhuvneshwar|Bhuvi)\b/g, playerKey: "bhuvneshwar-kumar" },
  { regex: /\b(T Natarajan|Natarajan)\b/g, playerKey: "t-natarajan" },
  { regex: /\b(Nitish Kumar Reddy|Nitish Reddy)\b/g, playerKey: "nitish-reddy" },
  { regex: /\b(Virat Kohli|Kohli)\b/g, playerKey: "virat-kohli" },
  { regex: /\b(Yash Dayal|Dayal)\b/g, playerKey: "yash-dayal" },
  { regex: /\b(MS Dhoni|Dhoni)\b/g, playerKey: "ms-dhoni" },
  { regex: /\b(Jasprit Bumrah|Bumrah)\b/g, playerKey: "jasprit-bumrah" },
  { regex: /\b(Sunil Narine|Narine)\b/g, playerKey: "sunil-narine" },
  { regex: /\b(Sanju Samson|Samson)\b/g, playerKey: "sanju-samson" },
  { regex: /\b(Rishabh Pant|Pant)\b/g, playerKey: "rishabh-pant" },
  { regex: /\b(Shashank Singh)\b/g, playerKey: "shashank-singh" },
  { regex: /\b(Shubman Gill|Gill)\b/g, playerKey: "shubman-gill" },
  { regex: /\b(Nicholas Pooran|Pooran)\b/g, playerKey: "nicholas-pooran" },
];

export interface PowerplaySeasonStats {
  season: string;
  runRate: number;
  dotBallPct: number;
  boundaryFreqBalls: number;
  label: string;
}

export const FRANCHISE_POWERPLAY_TIMELINE: Record<string, PowerplaySeasonStats[]> = {
  SRH: [
    { season: "2022", runRate: 7.42, dotBallPct: 48.2, boundaryFreqBalls: 5.1, label: "Defensive Anchor Baseline" },
    { season: "2023", runRate: 7.85, dotBallPct: 44.1, boundaryFreqBalls: 4.8, label: "Transitioning Baseline" },
    { season: "2024", runRate: 11.45, dotBallPct: 28.6, boundaryFreqBalls: 2.7, label: "Hyper-Velocity (125/0 All-Time IPL Peak)" },
  ],
  RCB: [
    { season: "2022", runRate: 7.78, dotBallPct: 45.4, boundaryFreqBalls: 4.9, label: "Stability Phase" },
    { season: "2023", runRate: 8.72, dotBallPct: 39.8, boundaryFreqBalls: 4.0, label: "Faf-Kohli Momentum" },
    { season: "2024", runRate: 10.12, dotBallPct: 32.1, boundaryFreqBalls: 3.3, label: "Late-Season Surge (6-Match Streak)" },
  ],
  CSK: [
    { season: "2022", runRate: 7.61, dotBallPct: 47.0, boundaryFreqBalls: 5.0, label: "Top-Order Reset" },
    { season: "2023", runRate: 9.38, dotBallPct: 35.6, boundaryFreqBalls: 3.7, label: "Conway-Gaikwad Title Engine" },
    { season: "2024", runRate: 8.94, dotBallPct: 38.2, boundaryFreqBalls: 3.9, label: "Chepauk Measured Approach" },
  ],
  MI: [
    { season: "2022", runRate: 7.50, dotBallPct: 46.8, boundaryFreqBalls: 5.2, label: "Rebuild Phase" },
    { season: "2023", runRate: 9.15, dotBallPct: 37.4, boundaryFreqBalls: 3.8, label: "Wankhede High-Scoring Surge" },
    { season: "2024", runRate: 9.68, dotBallPct: 35.1, boundaryFreqBalls: 3.5, label: "Aggressive Middle Blueprint" },
  ],
  KKR: [
    { season: "2022", runRate: 7.82, dotBallPct: 44.9, boundaryFreqBalls: 4.7, label: "Opening Volatility" },
    { season: "2023", runRate: 8.65, dotBallPct: 41.2, boundaryFreqBalls: 4.2, label: "Gurbaz-Roy Counterattack" },
    { season: "2024", runRate: 11.08, dotBallPct: 30.4, boundaryFreqBalls: 2.9, label: "Narine-Salt Championship Blitz" },
  ],
  RR: [
    { season: "2022", runRate: 8.42, dotBallPct: 42.0, boundaryFreqBalls: 4.3, label: "Buttler Century Campaign" },
    { season: "2023", runRate: 9.20, dotBallPct: 36.8, boundaryFreqBalls: 3.7, label: "Jaiswal 13-Ball Blitz Milestone" },
    { season: "2024", runRate: 9.45, dotBallPct: 36.1, boundaryFreqBalls: 3.6, label: "Top-Order Consistency" },
  ],
  DC: [
    { season: "2022", runRate: 8.90, dotBallPct: 38.5, boundaryFreqBalls: 3.9, label: "Shaw-Warner High Velocity" },
    { season: "2023", runRate: 7.35, dotBallPct: 49.1, boundaryFreqBalls: 5.4, label: "Injury Setback Season" },
    { season: "2024", runRate: 9.85, dotBallPct: 34.0, boundaryFreqBalls: 3.4, label: "Fraser-McGurk Ultra-Aggression" },
  ],
  PBKS: [
    { season: "2022", runRate: 8.92, dotBallPct: 38.1, boundaryFreqBalls: 3.8, label: "All-Out Attack Doctrine" },
    { season: "2023", runRate: 8.55, dotBallPct: 42.4, boundaryFreqBalls: 4.2, label: "Mid-Pack Aggression" },
    { season: "2024", runRate: 9.18, dotBallPct: 38.9, boundaryFreqBalls: 3.7, label: "Record 262 Run Chase at Eden" },
  ],
  GT: [
    { season: "2022", runRate: 8.15, dotBallPct: 43.5, boundaryFreqBalls: 4.5, label: "Inaugural Champions (Balanced)" },
    { season: "2023", runRate: 8.85, dotBallPct: 39.0, boundaryFreqBalls: 4.1, label: "Gill 890-Run Dominance" },
    { season: "2024", runRate: 8.40, dotBallPct: 42.8, boundaryFreqBalls: 4.4, label: "Recalibration Year" },
  ],
  LSG: [
    { season: "2022", runRate: 8.24, dotBallPct: 42.8, boundaryFreqBalls: 4.4, label: "Playoff Debut" },
    { season: "2023", runRate: 8.48, dotBallPct: 41.5, boundaryFreqBalls: 4.3, label: "Ekana Pitch Dynamics" },
    { season: "2024", runRate: 8.75, dotBallPct: 40.2, boundaryFreqBalls: 4.1, label: "Pooran-Stoinis Acceleration" },
  ],
};

export interface KeyPlayerMatchup {
  batter: string;
  batterRole: string;
  bowler: string;
  bowlerTeam: string;
  ballsFaced: number;
  runs: number;
  dismissals: number;
  strikeRate: number;
  verdict: string;
}

export const FRANCHISE_KEY_MATCHUPS: Record<string, KeyPlayerMatchup[]> = {
  SRH: [
    {
      batter: "Travis Head",
      batterRole: "Opener (SRH)",
      bowler: "Jasprit Bumrah",
      bowlerTeam: "MI",
      ballsFaced: 34,
      runs: 48,
      dismissals: 2,
      strikeRate: 141.2,
      verdict: "Bumrah limits boundary count to 14.7% with targeted hard lengths.",
    },
    {
      batter: "Heinrich Klaasen",
      batterRole: "Middle Order (SRH)",
      bowler: "Varun Chakaravarthy",
      bowlerTeam: "KKR",
      ballsFaced: 29,
      runs: 54,
      dismissals: 1,
      strikeRate: 186.2,
      verdict: "Klaasen dominates mystery spin through mid-wicket arc.",
    },
    {
      batter: "Abhishek Sharma",
      batterRole: "Opener (SRH)",
      bowler: "Rashid Khan",
      bowlerTeam: "GT",
      ballsFaced: 26,
      runs: 45,
      dismissals: 0,
      strikeRate: 173.1,
      verdict: "Zero dismissals; fearless sweep against leg-break variations.",
    },
  ],
  RCB: [
    {
      batter: "Virat Kohli",
      batterRole: "Anchor / Opener (RCB)",
      bowler: "Sandeep Sharma",
      bowlerTeam: "RR",
      ballsFaced: 67,
      runs: 82,
      dismissals: 7,
      strikeRate: 122.4,
      verdict: "Historic nemesis; seam movement into right-hander exposes pads early.",
    },
    {
      batter: "Rajat Patidar",
      batterRole: "No. 4 (RCB)",
      bowler: "Ravi Bishnoi",
      bowlerTeam: "LSG",
      ballsFaced: 22,
      runs: 46,
      dismissals: 0,
      strikeRate: 209.1,
      verdict: "Elite spin destroyer; 200+ SR against wrist-spin line.",
    },
  ],
  CSK: [
    {
      batter: "Ruturaj Gaikwad",
      batterRole: "Top Order (CSK)",
      bowler: "Trent Boult",
      bowlerTeam: "RR",
      ballsFaced: 36,
      runs: 38,
      dismissals: 3,
      strikeRate: 105.6,
      verdict: "Boult's left-arm inswing tests Gaikwad's front-pad defense.",
    },
    {
      batter: "Shivam Dube",
      batterRole: "Spin Enforcer (CSK)",
      bowler: "Kuldeep Yadav",
      bowlerTeam: "DC",
      ballsFaced: 28,
      runs: 58,
      dismissals: 1,
      strikeRate: 207.1,
      verdict: "Long levers generate towering sixes down the ground against left-arm spin.",
    },
  ],
  MI: [
    {
      batter: "Rohit Sharma",
      batterRole: "Opener (MI)",
      bowler: "Mitchell Starc",
      bowlerTeam: "KKR",
      ballsFaced: 32,
      runs: 39,
      dismissals: 3,
      strikeRate: 121.9,
      verdict: "Starc's extreme pace angle traps front pad across the line.",
    },
    {
      batter: "Suryakumar Yadav",
      batterRole: "360° Specialist (MI)",
      bowler: "Rashid Khan",
      bowlerTeam: "GT",
      ballsFaced: 47,
      runs: 84,
      dismissals: 1,
      strikeRate: 178.7,
      verdict: "Supreme sweep & scoop execution neutralizes googly threat.",
    },
  ],
  KKR: [
    {
      batter: "Sunil Narine",
      batterRole: "Pinch Opener (KKR)",
      bowler: "Jasprit Bumrah",
      bowlerTeam: "MI",
      ballsFaced: 18,
      runs: 14,
      dismissals: 2,
      strikeRate: 77.8,
      verdict: "Bumrah's sharp short balls eliminate Narine's backfoot swing.",
    },
    {
      batter: "Andre Russell",
      batterRole: "Finisher (KKR)",
      bowler: "Bhuvneshwar Kumar",
      bowlerTeam: "SRH",
      ballsFaced: 42,
      runs: 89,
      dismissals: 2,
      strikeRate: 211.9,
      verdict: "Explosive boundary rate whenever Bhuvneshwar misses yorker length.",
    },
  ],
  RR: [
    {
      batter: "Sanju Samson",
      batterRole: "Top Order (RR)",
      bowler: "Sunil Narine",
      bowlerTeam: "KKR",
      ballsFaced: 46,
      runs: 52,
      dismissals: 3,
      strikeRate: 113.0,
      verdict: "Narine maintains tight line to stifle Samson's off-side drive.",
    },
    {
      batter: "Yashasvi Jaiswal",
      batterRole: "Opener (RR)",
      bowler: "Deepak Chahar",
      bowlerTeam: "CSK",
      ballsFaced: 30,
      runs: 56,
      dismissals: 1,
      strikeRate: 186.7,
      verdict: "Jaiswal steps out early to counteract conventional new-ball swing.",
    },
  ],
  DC: [
    {
      batter: "Rishabh Pant",
      batterRole: "Middle Order (DC)",
      bowler: "Yuzvendra Chahal",
      bowlerTeam: "RR",
      ballsFaced: 52,
      runs: 83,
      dismissals: 2,
      strikeRate: 159.6,
      verdict: "Aggressive slog sweep vs wide outside off flight battle.",
    },
  ],
  PBKS: [
    {
      batter: "Shashank Singh",
      batterRole: "Death Finisher (PBKS)",
      bowler: "Harshit Rana",
      bowlerTeam: "KKR",
      ballsFaced: 21,
      runs: 46,
      dismissals: 0,
      strikeRate: 219.0,
      verdict: "Capitalizes on slower-ball bouncers with flat pull shots.",
    },
  ],
  GT: [
    {
      batter: "Shubman Gill",
      batterRole: "Anchor / Opener (GT)",
      bowler: "Mohammed Siraj",
      bowlerTeam: "RCB",
      ballsFaced: 44,
      runs: 66,
      dismissals: 1,
      strikeRate: 150.0,
      verdict: "Exceptional backfoot punch through covers against hard seam.",
    },
  ],
  LSG: [
    {
      batter: "Nicholas Pooran",
      batterRole: "Finisher (LSG)",
      bowler: "Harshal Patel",
      bowlerTeam: "PBKS",
      ballsFaced: 31,
      runs: 68,
      dismissals: 1,
      strikeRate: 219.4,
      verdict: "Punishes dipping slower balls with monstrous clearing strikes.",
    },
  ],
};

/**
 * Routes a slug to the v2 article view when a visible v2 article owns it (published, or any status on
 * localhost); otherwise the legacy page renders exactly as before. Revisions keep the legacy URL, so a
 * public build keeps serving the legacy text until the revision is published.
 */
export default function ArticleDetailPage({ params }: { params?: { slug?: string } }) {
  const [location] = useLocation();
  const slug = useMemo(() => {
    const raw = params?.slug ?? (location.includes("/articles/") ? location.split("/articles/")[1]?.split(/[?#]/)[0] ?? "" : "");
    return decodeURIComponent(raw).replace(/^\/+|\/+$/g, "").trim();
  }, [params?.slug, location]);
  const v2 = useMemo(() => findV2BySlug(slug), [slug]);
  if (v2) return <ArticleV2View key={v2.id} entry={v2} />;
  // An unknown slug is a missing page, not the first article in the archive.
  if (!getEditorialArticleBySlug(slug)) return <NotFound />;
  return <LegacyArticleDetailPage params={params} />;
}

function LegacyArticleDetailPage({ params }: { params?: { slug?: string } }) {
  const [dugoutMatch, dugoutParams] = useRoute("/dugout/articles/:slug*");
  const [directMatch, directParams] = useRoute("/articles/:slug*");
  const [location] = useLocation();

  // Scroll to top immediately when route changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location, params?.slug]);

  // Comprehensive slug extraction from props, route params, wouter location, or window.location
  const rawSlug = useMemo(() => {
    if (params?.slug) return params.slug;
    if ((dugoutParams as any)?.slug) return (dugoutParams as any).slug;
    if ((dugoutParams as any)?.["slug*"]) return (dugoutParams as any)["slug*"];
    if ((directParams as any)?.slug) return (directParams as any).slug;
    if ((directParams as any)?.["slug*"]) return (directParams as any)["slug*"];
    if (location && location.includes("/articles/")) {
      return location.split("/articles/")[1]?.split(/[?#]/)[0] || "";
    }
    if (typeof window !== "undefined" && window.location.pathname.includes("/articles/")) {
      return window.location.pathname.split("/articles/")[1]?.split(/[?#]/)[0] || "";
    }
    return "";
  }, [params, dugoutParams, directParams, location]);

  const slug = useMemo(() => {
    return decodeURIComponent(rawSlug).replace(/^\/+|\/+$/g, "").trim();
  }, [rawSlug]);

  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Live Fan Poll state
  const [pollVoted, setPollVoted] = useState<"yes" | "no" | null>(null);
  const [pollCounts, setPollCounts] = useState({ yes: 4892, no: 1140 });

  // Newsletter state
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const article = useMemo(() => {
    return getEditorialArticleBySlug(slug) || EDITORIAL_ARTICLES[0];
  }, [slug]);

  // Franchise Metadata
  const franchiseCode = article?.teamCode ?? "SRH";
  const franchiseMeta = useMemo(() => {
    return (
      FRANCHISE_METADATA[franchiseCode.toUpperCase()] || {
        name: "IPL Franchise",
        identity: "Franchise cricket intelligence and strategic analysis",
        accent: "#f97316",
        venue: "Home Fortress",
      }
    );
  }, [franchiseCode]);

  const team = isTeamCode(franchiseCode) ? TEAM_REGISTRY[franchiseCode] : undefined;
  const teamAccent = team?.accent || franchiseMeta.accent || "#f97316";
  const teamLabel = team?.name || franchiseMeta.name;
  const dugoutUrl = `/dugout/${franchiseCode.toLowerCase()}`;

  // Related franchise stories
  const relatedArticles = useMemo(() => {
    if (!article) return [];
    const pool = EDITORIAL_ARTICLES.filter(
      (a) => a.teamCode === article.teamCode && a.slug !== article.slug
    );
    if (article.relatedSlugs && article.relatedSlugs.length > 0) {
      const explicit = pool.filter((a) => article.relatedSlugs.includes(a.slug));
      if (explicit.length > 0) return explicit.slice(0, 3);
    }
    return pool.slice(0, 3);
  }, [article]);

  const cycleFontSize = () => {
    setFontSize((prev) => {
      if (prev === "normal") return "large";
      if (prev === "large") return "xl";
      return "normal";
    });
  };

  const bodyTextClass = useMemo(() => {
    switch (fontSize) {
      case "large":
        return "text-lg sm:text-xl leading-[1.8]";
      case "xl":
        return "text-xl sm:text-2xl leading-[1.85]";
      default:
        return "text-base sm:text-[17px] leading-[1.75]";
    }
  }, [fontSize]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVote = (choice: "yes" | "no") => {
    if (pollVoted) return;
    setPollVoted(choice);
    setPollCounts((prev) => ({
      ...prev,
      [choice]: prev[choice] + 1,
    }));
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setNewsletterSubscribed(true);
    setEmailInput("");
  };

  // Active Chapter & Reading Progress state for Sticky Reading Companion
  const [activeSection, setActiveSection] = useState(0);
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const pct = Math.min(100, Math.max(0, Math.round((scrollY / docHeight) * 100)));
        setReadProgress(pct);
      }

      const chapters = article?.chapters || [];
      for (let i = chapters.length - 1; i >= 0; i--) {
        const el = document.getElementById(`chapter-${i + 1}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) {
            setActiveSection(i);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [article]);

  const scrollToChapter = (idx: number) => {
    const el = document.getElementById(`chapter-${idx + 1}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const powerplayTimeline = useMemo(() => {
    return FRANCHISE_POWERPLAY_TIMELINE[franchiseCode.toUpperCase()] || null;
  }, [franchiseCode]);

  const keyMatchups = useMemo(() => {
    return FRANCHISE_KEY_MATCHUPS[franchiseCode.toUpperCase()] || null;
  }, [franchiseCode]);

  const analyticsLinks = useMemo(() => [
    {
      title: `${teamLabel} Headquarters`,
      desc: "Franchise records, squad roster & timeline",
      href: dugoutUrl,
      badge: "Dugout",
      icon: Shield,
    },
    {
      title: "Match Intelligence Desk",
      desc: "Tactical match analytics, phases & win probability",
      href: "/intelligence",
      badge: "Tactics",
      icon: BarChart2,
    },
    {
      title: "IPL Records & Statistics",
      desc: "Complete tournament record books & phase splits",
      href: "/stats",
      badge: "Telemetry",
      icon: TrendingUp,
    },
    {
      title: "Talent Scouting Lab",
      desc: "Player scouting profiles & match performance",
      href: "/scout",
      badge: "Scout Lab",
      icon: ArrowUpRight,
    },
  ], [teamLabel, dugoutUrl]);

  // Track player spins to ensure subtle bio popovers only appear on the FIRST mention
  const renderedPlayerSpins = useMemo(() => new Set<string>(), [slug]);

  const renderParagraphWithPlayerBio = (text: string, isLead: boolean = false) => {
    let remaining = text;
    const parts: React.ReactNode[] = [];
    let keyIdx = 0;

    while (remaining.length > 0) {
      let earliestMatch: {
        index: number;
        length: number;
        matchedText: string;
        playerKey: string;
      } | null = null;

      for (const alias of PLAYER_NAME_ALIASES) {
        if (renderedPlayerSpins.has(alias.playerKey)) continue;

        alias.regex.lastIndex = 0;
        const match = alias.regex.exec(remaining);
        if (match) {
          if (!earliestMatch || match.index < earliestMatch.index) {
            earliestMatch = {
              index: match.index,
              length: match[0].length,
              matchedText: match[0],
              playerKey: alias.playerKey,
            };
          }
        }
      }

      if (!earliestMatch) {
        parts.push(remaining);
        break;
      }

      if (earliestMatch.index > 0) {
        parts.push(remaining.substring(0, earliestMatch.index));
      }

      renderedPlayerSpins.add(earliestMatch.playerKey);
      const playerBio = CURATED_PLAYERS[earliestMatch.playerKey];

      if (playerBio) {
        parts.push(
          <span
            key={`player-link-${earliestMatch.playerKey}-${keyIdx++}`}
            className="relative inline-block group/cric"
          >
            <Link
              href={`/players/${playerBio.slug}`}
              className="text-sky-400 hover:text-sky-300 font-medium underline decoration-sky-400/40 hover:decoration-sky-300 underline-offset-2 transition-colors cursor-pointer"
            >
              {earliestMatch.matchedText}
            </Link>

            {/* Subtle Cricinfo/Cricbuzz floating bio popover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl bg-[#111722] border border-gray-700/80 shadow-2xl opacity-0 pointer-events-none group-hover/cric:opacity-100 group-hover/cric:pointer-events-auto transition-all duration-200 z-50 text-left">
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-800">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-950 border border-gray-700 shrink-0">
                  <img
                    src={playerBio.image}
                    alt={playerBio.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-white text-xs truncate">
                    {playerBio.name}
                  </h5>
                  <p className="text-[10px] text-gray-400 truncate">
                    {playerBio.teamCode} • {playerBio.role}
                  </p>
                </div>
              </div>

              <div className="py-2 text-[10px] space-y-1 text-gray-300 font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans">Batting:</span>
                  <span className="truncate max-w-[120px]">{playerBio.batStyle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans">Bowling:</span>
                  <span className="truncate max-w-[120px]">{playerBio.bowlStyle}</span>
                </div>
                {playerBio.iplStatsSummary && (
                  <div className="pt-1 mt-1 border-t border-gray-800/80 text-[10px] text-sky-400 font-sans font-medium">
                    {playerBio.iplStatsSummary}
                  </div>
                )}
              </div>

              <div className="pt-1.5 border-t border-gray-800 text-right">
                <span className="text-[10px] text-sky-400 hover:underline font-semibold inline-flex items-center gap-0.5">
                  Full Player Profile →
                </span>
              </div>
            </div>
          </span>
        );
      } else {
        parts.push(earliestMatch.matchedText);
      }

      remaining = remaining.substring(earliestMatch.index + earliestMatch.length);
    }

    return (
      <p className={isLead ? "text-lg sm:text-xl font-medium text-gray-200 leading-relaxed" : "text-gray-300"}>
        {parts}
      </p>
    );
  };

  // Rights-cleared photography only (approved Getty embeds / licensed files).
  // On the localhost dev server, Getty candidates with an official embed code also render (via Getty's
  // Embedded Viewer). Production builds strip those candidates, so only approved images ship.
  const articleImages = useMemo(
    () => ({
      ...(import.meta.env.DEV ? getLocalEmbedImages(article.id) : {}),
      ...getPublishedArticleImages(article.id),
    }),
    [article.id],
  );

  const modules = article.sidebarModules || {};
  const totalVotes = pollCounts.yes + pollCounts.no;
  const yesPct = Math.round((pollCounts.yes / totalVotes) * 100);
  const noPct = 100 - yesPct;

  return (
    <Layout hideRightPanel>
      <div className="w-full min-h-screen bg-[#070c16] text-gray-200 antialiased">
        
        {/* Editorial Sub-Navigation & Breadcrumbs */}
        <div className="border-b border-gray-800/80 bg-[#070c16]/95 backdrop-blur-md px-4 py-2.5 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400 truncate">
              <Link href="/home" className="hover:text-white transition">Home</Link>
              <span>/</span>
              <Link href="/dugout" className="hover:text-white transition">Dugout</Link>
              <span>/</span>
              <Link href={dugoutUrl} className="hover:text-white transition truncate font-medium" style={{ color: teamAccent }}>
                {teamLabel}
              </Link>
              <span className="hidden sm:inline">/</span>
              <span className="hidden sm:inline text-gray-300 truncate">{article.parameter || "Match Analysis"}</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Text Size Toggle */}
              <button
                onClick={cycleFontSize}
                title={`Text size: ${fontSize}`}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-400 hover:text-white rounded-md hover:bg-gray-800/60 transition cursor-pointer"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="uppercase text-[10px] font-mono font-semibold">{fontSize}</span>
              </button>

              {/* Bookmark Button */}
              <button
                onClick={() => setBookmarked((b) => !b)}
                title={bookmarked ? "Saved" : "Bookmark article"}
                className={`p-1.5 rounded-md hover:bg-gray-800/60 transition cursor-pointer ${
                  bookmarked ? "text-amber-400" : "text-gray-400 hover:text-white"
                }`}
              >
                <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-amber-400" : ""}`} />
              </button>

              {/* Share Button */}
              <button
                onClick={handleCopyLink}
                title="Share article"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-400 hover:text-white rounded-md hover:bg-gray-800/60 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── TOP EDITORIAL HEADER & HERO BANNER ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-2 sm:pb-3">
          
          {/* Eyebrow Pill Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider">
              <span style={{ color: teamAccent }}>{teamLabel}</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-300">{article.parameter || "Match Analysis"}</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400 font-normal">5-PART SPECIAL REPORT</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border bg-sky-500/10 text-sky-400 border-sky-500/30">
                IPL 2024
              </span>
            </div>
          </div>

          {/* Main Sports Headline & Subtitle */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-extrabold text-white tracking-tight leading-[1.16] mb-3">
            {article.title}
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed font-normal max-w-4xl mb-5">
            {article.subtitle}
          </p>

          {/* Byline Strip */}
          <div className="flex items-center justify-between py-3 border-y border-gray-800/80 mb-5 text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-sm"
                style={{ backgroundColor: teamAccent }}
              >
                {article.author.avatarText || "CF"}
              </div>
              <div>
                <span className="font-semibold text-white">{article.author.name}</span>
                <span className="text-gray-500 mx-1.5">•</span>
                <span className="text-gray-400">{article.publishedDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-400 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>{article.readTime}</span>
            </div>
          </div>

          {/* 2-Column Split Header / Hero Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch my-6">
            {/* Left Side: Image / Getty Embed (Takes 7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-center items-center rounded-2xl overflow-hidden border border-slate-800 bg-[#08131F] p-3 sm:p-4 shadow-xl">
              {(() => {
                const illustration = (
                  <div className="overflow-hidden rounded-xl">
                    <EditorialCoverCanvas
                      franchiseName={teamLabel}
                      teamCode={franchiseCode}
                      parameter={article.parameter}
                      parameterNumber={article.parameterNumber}
                      title={article.title}
                      accent={teamAccent}
                      coverImage={article.coverImage}
                      aspectRatio="hero"
                      isCoverStory={article.isCoverStory}
                    />
                  </div>
                );
                return articleImages.hero ? (
                  <EditorialImageFigure key={`${article.id}-hero`} image={articleImages.hero} variant="hero" allowUnpublished={import.meta.env.DEV} fallback={illustration} />
                ) : (
                  illustration
                );
              })()}
            </div>

            {/* Right Side: Tactical Card (Takes 5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 backdrop-blur shadow-2xl">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest truncate" style={{ color: teamAccent }}>
                    <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: teamAccent }} />
                    <span>TELEMETRY SNAPSHOT · {franchiseCode}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Tactical Pulse</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-base sm:text-lg font-black tracking-tight text-white">
                      {article.parameter || "Match Analysis"}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Key quantitative indicators synthesized from warehouse match records.
                    </p>
                  </div>

                  {article.keyStats && article.keyStats.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      {article.keyStats.slice(0, 4).map((stat, idx) => (
                        <div key={idx} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight" style={{ color: teamAccent }}>
                            {stat.value}
                          </div>
                          <div className="text-[10px] font-mono text-slate-300 mt-0.5 leading-snug">
                            {stat.label}
                          </div>
                          {stat.sub && (
                            <div className="text-[9px] text-slate-500 truncate mt-0.5">{stat.sub}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        “Statistical telemetry and performance levers verified against official match deliveries.”
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono">CricField Dossier Telemetry</span>
                <span className="font-semibold" style={{ color: teamAccent }}>
                  {article.readTime}
                </span>
              </div>
            </div>
          </div>
          <GettyPhotoNotice images={Object.values(articleImages)} />

        </div>

        {/* ── CONTINUOUS 2-COLUMN JOURNALISM GRID ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ════ LEFT COLUMN: CONTINUOUS 5-SEGMENT STORYTELLING STREAM (lg:col-span-8) ════ */}
            <div className="lg:col-span-8 space-y-8 min-w-0">
              {article.chapters?.map((chapter, cIdx) => (
                <article
                  key={chapter.number || cIdx}
                  id={`chapter-${cIdx + 1}`}
                  className="space-y-4 pt-6 first:pt-0 border-t first:border-t-0 border-gray-800/60 scroll-mt-24"
                >
                  {/* Bespoke Segment Header */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${teamAccent}15`,
                          color: teamAccent,
                        }}
                      >
                        {chapter.title || `CHAPTER 0${cIdx + 1}`}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl md:text-[26px] font-extrabold text-white tracking-tight leading-snug">
                      {chapter.heading}
                    </h2>
                  </div>

                  {/* Narrative Body Text */}
                  <div className={`space-y-4 ${bodyTextClass}`}>
                    {chapter.body?.map((paragraph, pIdx) => {
                      const sectionId = `s${cIdx + 1}` as EditorialSectionId;
                      const sectionImage = pIdx === 0 ? articleImages[sectionId] : undefined;
                      return (
                        <React.Fragment key={pIdx}>
                          {renderParagraphWithPlayerBio(paragraph, cIdx === 0 && pIdx === 0)}
                          {sectionImage && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch my-6">
                              <div className="lg:col-span-7 flex flex-col justify-center items-center rounded-xl bg-[#08131F] border border-slate-800 p-3 sm:p-4 overflow-hidden shadow-inner">
                                <EditorialImageFigure key={`${article.id}-${sectionId}`} image={sectionImage} allowUnpublished={import.meta.env.DEV} />
                              </div>
                              <div className="lg:col-span-5 flex flex-col justify-between rounded-xl bg-slate-900/70 border border-slate-800/80 p-5 backdrop-blur-md shadow-2xl">
                                <div>
                                  <div
                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase mb-3 border"
                                    style={{ backgroundColor: `${teamAccent}15`, borderColor: `${teamAccent}40`, color: teamAccent }}
                                  >
                                    SEGMENT TELEMETRY · {sectionId.toUpperCase()}
                                  </div>
                                  <h4 className="text-base font-bold text-slate-100 mb-1">{chapter.title || "Tactical Telemetry"}</h4>
                                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                    Quantitative indicators and verified performance metrics from warehouse records.
                                  </p>
                                  {chapter.table && chapter.table.rows && chapter.table.rows.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2.5 my-3">
                                      {chapter.table.rows.slice(0, 4).map((row, rIdx) => (
                                        <div key={rIdx} className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
                                          <span className="text-base sm:text-lg font-black text-slate-100 font-mono">{row[1] || row[0]}</span>
                                          <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{row[0]}</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 my-3">
                                      <span className="text-sm font-bold text-slate-200">Phase Analytics Snapshot</span>
                                      <p className="text-[11px] text-slate-400 mt-0.5">Calculated over historical IPL innings with phase and venue controls.</p>
                                    </div>
                                  )}
                                </div>
                                <div className="border-t border-slate-800/80 pt-3 mt-3">
                                  <p className="text-xs italic text-slate-300 border-l-2 pl-2.5 leading-snug" style={{ borderLeftColor: teamAccent }}>
                                    "{chapter.quote || "Tactical discipline and phase leverage dictate modern IPL match trajectories."}"
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Inline Stats Table (Present in Segment 2) */}
                  {chapter.table && (
                    <div className="my-6 overflow-hidden rounded-xl border border-gray-800 bg-[#101726]">
                      <div className="px-4 py-2.5 bg-[#141d30] border-b border-gray-800 flex items-center justify-between">
                        <span className="font-semibold text-xs text-white uppercase tracking-wider">
                          {article.parameter} — Key Match Statistics
                        </span>
                        <span className="text-[10px] text-sky-400 font-mono font-bold">Official Records</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                          <thead className="text-gray-400 border-b border-gray-800 text-xs font-semibold uppercase bg-gray-900/40">
                            <tr>
                              {chapter.table.headers.map((h, i) => (
                                <th key={i} className="py-2.5 px-3.5 font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/60 font-mono text-gray-300 text-xs sm:text-sm">
                            {chapter.table.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-gray-800/30 transition">
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx} className="py-2.5 px-3.5">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Pull Quote (Present in Segment 3) */}
                  {chapter.quote && (
                    <blockquote
                      className="my-6 border-l-4 pl-4 py-3 italic text-gray-200 text-base sm:text-lg bg-white/[0.02] rounded-r-lg"
                      style={{ borderColor: teamAccent }}
                    >
                      “{chapter.quote}”
                    </blockquote>
                  )}
                </article>
              ))}

              {/* Bottom Navigation */}
              <div className="pt-6 flex items-center justify-between text-xs text-gray-400 border-t border-gray-800">
                <Link
                  href={dugoutUrl}
                  onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
                  className="inline-flex items-center gap-1.5 hover:text-white transition font-medium"
                  style={{ color: teamAccent }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to {teamLabel} Dugout</span>
                </Link>
                <Link
                  href={dugoutUrl}
                  onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
                  className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition font-medium"
                >
                  <span>Explore All 10 Franchise Stories</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* ════ RIGHT COLUMN: RICH EDITORIAL SPORTS RAIL (lg:col-span-4) ════ */}
            <aside className="lg:col-span-4 space-y-6 mt-8 lg:mt-0 min-w-0">
              
              {/* 1. MATCH DOSSIER / MATCH CENTER */}
              {modules.matchDossier && (
                <div className="rounded-xl border border-gray-800 bg-[#101726] p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                      Match Center
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                      style={{ color: teamAccent, backgroundColor: `${teamAccent}15` }}
                    >
                      {team?.shortName ?? franchiseCode}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fixture:</span>
                      <span className="font-semibold text-white">{modules.matchDossier.matchTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Venue:</span>
                      <span className="font-semibold text-white truncate max-w-[190px]">{modules.matchDossier.venue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Result:</span>
                      <span className="font-semibold text-emerald-400">{modules.matchDossier.result}</span>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-gray-800 font-mono text-[11px] text-gray-300">
                      {modules.matchDossier.scorecardSummary}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. KEY FIGURE IN FOCUS */}
              {modules.keyFigure && (
                <div className="rounded-xl border border-gray-800 bg-[#101726] p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                        Player in Focus
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">Spotlight</span>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800 space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-sm font-bold text-white">{modules.keyFigure.name}</h4>
                      <span className="text-[10px] font-mono text-gray-400">{modules.keyFigure.role}</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {modules.keyFigure.summary}
                    </p>
                  </div>
                </div>
              )}

              {/* 3. STAT OF THE STORY */}
              {modules.statOfTheStory && (
                <div className="rounded-xl border border-gray-800 bg-gradient-to-br from-[#101726] to-[#0c1220] p-4 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                      ★ Stat of the Match
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">Key Number</span>
                  </div>
                  <div className="pt-1">
                    <div className="text-3xl font-black font-mono" style={{ color: teamAccent }}>
                      {modules.statOfTheStory.metric}
                    </div>
                    <div className="text-xs font-bold text-white mt-1">
                      {modules.statOfTheStory.label}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mt-1.5">
                      {modules.statOfTheStory.explanation}
                    </p>
                  </div>
                </div>
              )}

              {/* 4. TACTICAL CHALKBOARD */}
              {modules.tacticalChalkboard && (
                <div className="rounded-xl border border-gray-800 bg-[#101726] p-4 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 font-mono">
                      Tactical Chalkboard
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {modules.tacticalChalkboard.phase}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-gray-800 space-y-1">
                    <div className="text-xs font-bold text-white">{modules.tacticalChalkboard.title}</div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {modules.tacticalChalkboard.setup}
                    </p>
                  </div>
                </div>
              )}

              {/* 5. HISTORIC MILESTONE */}
              {modules.historicalRecords && (
                <div className="rounded-xl border border-gray-800 bg-[#101726] p-4 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                        Historical Milestone
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-orange-400 font-bold">IPL Record</span>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800 space-y-1">
                    <div className="text-sm font-black text-white">{modules.historicalRecords.recordTitle}</div>
                    <div className="text-xs font-mono font-bold text-amber-400">{modules.historicalRecords.milestone}</div>
                    <p className="text-[11px] text-gray-400">{modules.historicalRecords.context}</p>
                  </div>
                </div>
              )}

              {/* 6. SEASON POINTS STANDINGS */}
              {modules.seasonPointsTable && (
                <div className="rounded-xl border border-gray-800 bg-[#101726] p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                        {modules.seasonPointsTable.season} Standings
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">Top 4</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="text-[10px] text-gray-500 uppercase border-b border-gray-800">
                        <tr>
                          <th className="pb-1.5 font-semibold">Team</th>
                          <th className="pb-1.5 text-center">M</th>
                          <th className="pb-1.5 text-center">W</th>
                          <th className="pb-1.5 text-right">Pts</th>
                          <th className="pb-1.5 text-right">NRR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60 text-xs">
                        {modules.seasonPointsTable.topTeams.map((row, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="py-2 font-sans font-bold text-white">{row.team}</td>
                            <td className="py-2 text-center text-gray-400">{row.played}</td>
                            <td className="py-2 text-center text-gray-400">{row.won}</td>
                            <td className="py-2 text-right font-bold text-white">{row.pts}</td>
                            <td className="py-2 text-right text-emerald-400">{row.nrr}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 7. FAN VERDICT PULSE POLL */}
              {modules.fanVerdictPoll && (
                <div className="rounded-xl border border-gray-800 bg-[#101726] p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                        Fan Pulse • Live Poll
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">Live</span>
                  </div>

                  <p className="text-xs font-semibold text-white leading-snug">
                    {modules.fanVerdictPoll.question}
                  </p>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleVote("yes")}
                      className={`w-full p-2.5 rounded-lg border text-left text-xs transition relative overflow-hidden flex items-center justify-between ${
                        pollVoted === "yes"
                          ? "border-emerald-500/60 bg-emerald-500/15 text-white"
                          : "border-gray-800 bg-gray-900/60 hover:border-gray-700 text-gray-300 cursor-pointer"
                      }`}
                    >
                      <span className="relative z-10 font-medium">{modules.fanVerdictPoll.optionA}</span>
                      <span className="relative z-10 font-mono font-bold text-emerald-400">{yesPct}%</span>
                      {pollVoted && (
                        <div
                          className="absolute inset-y-0 left-0 bg-emerald-500/20 transition-all duration-500"
                          style={{ width: `${yesPct}%` }}
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleVote("no")}
                      className={`w-full p-2.5 rounded-lg border text-left text-xs transition relative overflow-hidden flex items-center justify-between ${
                        pollVoted === "no"
                          ? "border-red-500/60 bg-red-500/15 text-white"
                          : "border-gray-800 bg-gray-900/60 hover:border-gray-700 text-gray-300 cursor-pointer"
                      }`}
                    >
                      <span className="relative z-10 font-medium">{modules.fanVerdictPoll.optionB}</span>
                      <span className="relative z-10 font-mono font-bold text-red-400">{noPct}%</span>
                      {pollVoted && (
                        <div
                          className="absolute inset-y-0 left-0 bg-red-500/20 transition-all duration-500"
                          style={{ width: `${noPct}%` }}
                        />
                      )}
                    </button>
                  </div>

                  <div className="pt-1 text-[10px] text-gray-500 flex items-center justify-between font-mono">
                    <span>{totalVotes.toLocaleString()} votes cast</span>
                    {pollVoted && <span className="text-emerald-400 font-bold">Vote recorded!</span>}
                  </div>
                </div>
              )}

              {/* 8. CONTEXTUAL MODULE: AGGRESSION TIMELINE */}
              {powerplayTimeline && powerplayTimeline.length > 0 && (
                <div className="rounded-xl border border-gray-800 bg-[#101726] p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                        Aggression Timeline
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono"
                      style={{ color: teamAccent, backgroundColor: `${teamAccent}15` }}
                    >
                      Powerplay (1–6)
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-snug">
                    Season-by-season powerplay scoring run rate and aggression benchmarks for {teamLabel}.
                  </p>

                  <div className="space-y-3 pt-1">
                    {powerplayTimeline.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-black/30 border border-gray-800/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: teamAccent }} />
                            IPL {item.season}
                          </span>
                          <span className="font-mono text-xs font-black" style={{ color: teamAccent }}>
                            {item.runRate.toFixed(2)} <span className="text-[10px] font-normal text-gray-400">RPO</span>
                          </span>
                        </div>
                        
                        <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.round((item.runRate / 12) * 100))}%`,
                              backgroundColor: teamAccent,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-0.5">
                          <span>Dot Ball: <strong className="text-gray-300">{item.dotBallPct}%</strong></span>
                          <span>Boundary: <strong className="text-gray-300">every {item.boundaryFreqBalls}b</strong></span>
                        </div>
                        <div className="text-[10px] text-gray-400 italic">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. CONTEXTUAL MODULE: KEY PLAYER MATCHUPS */}
              {keyMatchups && keyMatchups.length > 0 && (
                <div className="rounded-xl border border-gray-800 bg-[#101726] p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                        Key Player Matchups
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">Head-to-Head</span>
                  </div>

                  <div className="space-y-2.5">
                    {keyMatchups.map((m, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-black/30 border border-gray-800/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white truncate max-w-[140px]">{m.batter}</span>
                          <span className="text-gray-500 font-mono text-[10px]">vs</span>
                          <span className="font-bold text-gray-200 truncate max-w-[140px]">{m.bowler} ({m.bowlerTeam})</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 bg-white/[0.02] px-2 py-1 rounded">
                          <span>{m.ballsFaced} balls • {m.runs} runs</span>
                          <span className="text-amber-400 font-bold">{m.strikeRate.toFixed(1)} SR</span>
                          <span className="text-red-400 font-bold">{m.dismissals} out</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                          {m.verdict}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 10. CONTEXTUAL MODULE: EXPLORE THE DATA */}
              <div className="rounded-xl border border-gray-800 bg-[#101726] p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                      Explore the Data
                    </span>
                  </div>
                  <span className="text-[10px] text-sky-400 font-mono font-bold">Deep Links</span>
                </div>

                <div className="space-y-2">
                  {analyticsLinks.map((link, idx) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={idx}
                        href={link.href}
                        className="group flex items-start gap-2.5 p-2.5 rounded-lg bg-black/20 hover:bg-black/50 border border-gray-800 hover:border-gray-700 transition"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: `${teamAccent}20`, color: teamAccent }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-white group-hover:text-sky-400 transition truncate">
                              {link.title}
                            </h5>
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-400 group-hover:text-white">
                              {link.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            {link.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* 11. MORE STORIES FROM THIS FRANCHISE */}
              {relatedArticles.length > 0 && (
                <div className="rounded-xl border border-gray-800 bg-[#101726] p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                      More Stories • {teamLabel}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {relatedArticles.map((rel) => (
                      <Link
                        key={rel.id}
                        href={`/dugout/articles/${rel.slug}`}
                        onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
                        className="group block space-y-1 hover:text-sky-400 transition"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: teamAccent }}>
                          {rel.parameter}
                        </span>
                        <h4 className="text-xs font-bold text-gray-200 group-hover:text-sky-400 line-clamp-2 transition leading-snug">
                          {rel.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                          <span>{rel.publishedDate}</span>
                          <span>•</span>
                          <span>{rel.readTime}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 12. SPONSORED PARTNER BANNER (withheld on pages showing Getty embeds) */}
              <SponsorModule>
              <div className="rounded-xl overflow-hidden border border-gray-800 bg-[#101726] p-3 shadow-lg space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase text-gray-500 pb-1 border-b border-gray-800/60">
                  <span>Sponsored Partner</span>
                  <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400 font-bold">AD</span>
                </div>
                <AdVessel
                  slot="1029384758"
                  format="horizontal"
                  label="Official Partner Briefing • Cricket Coverage"
                  className="rounded-lg overflow-hidden my-1"
                />
              </div>
              </SponsorModule>

              {/* 13. THE TACTICAL DISPATCH NEWSLETTER */}
              <div className="rounded-xl border border-gray-800 bg-gradient-to-b from-[#141d2c] to-[#0d131f] p-4 space-y-3 shadow-lg">
                <div className="flex items-center gap-1.5 text-sky-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">The Tactical Dispatch</span>
                </div>
                <h4 className="text-xs font-bold text-white leading-tight">
                  Match analysis, tactical breakdowns and auction intelligence delivered to your inbox.
                </h4>

                {newsletterSubscribed ? (
                  <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Subscribed to {franchiseCode} match analysis!</span>
                  </div>
                ) : (
                  <form onSubmit={handleNewsletterSubmit} className="space-y-2 pt-1">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 transition"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span>Join 85,000+ Cricket Fans</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </form>
                )}

                <p className="text-[10px] text-gray-500 font-mono">
                  Weekly match analysis. Unsubscribe anytime.
                </p>
              </div>

              {/* 14. STICKY READING COMPANION (DESKTOP) */}
              <div className="hidden lg:block sticky top-20 z-10 rounded-xl border border-gray-800/90 bg-[#0e1524]/95 backdrop-blur-md p-4 space-y-3.5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase font-mono tracking-wider text-white">
                    <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                    <span>Reading Companion</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-sky-400">
                    {readProgress}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${readProgress}%`, backgroundColor: teamAccent }}
                  />
                </div>

                {/* Current Section Title */}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase font-bold text-gray-400 flex items-center justify-between">
                    <span>Current Section</span>
                    <span style={{ color: teamAccent }}>0{activeSection + 1} / 0{article.chapters?.length || 5}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                    {article.chapters?.[activeSection]?.heading || article.title}
                  </h4>
                </div>

                {/* Verified Editorial Insight / Key Stat */}
                {article.keyStats?.[0] && (
                  <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800/80 space-y-0.5">
                    <div className="text-[9px] font-mono uppercase text-gray-400">Verified Insight</div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-gray-200 truncate">{article.keyStats[0].label}</span>
                      <span className="text-xs font-mono font-black" style={{ color: teamAccent }}>{article.keyStats[0].value}</span>
                    </div>
                    {article.keyStats[0].sub && (
                      <div className="text-[10px] text-gray-500 truncate">{article.keyStats[0].sub}</div>
                    )}
                  </div>
                )}

                {/* Jump-to-Section Control */}
                <div className="space-y-1.5 pt-1 border-t border-gray-800/60">
                  <div className="text-[10px] font-mono uppercase font-semibold text-gray-400">Jump to Chapter</div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {article.chapters?.map((chap, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => scrollToChapter(idx)}
                        title={chap.heading}
                        className={`py-1.5 text-center text-xs font-mono font-bold rounded transition cursor-pointer ${
                          activeSection === idx
                            ? "text-white shadow-sm"
                            : "bg-gray-900/60 text-gray-400 hover:text-white hover:bg-gray-800/80 border border-gray-800"
                        }`}
                        style={activeSection === idx ? { backgroundColor: teamAccent } : undefined}
                      >
                        0{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </aside>

          </div>
        </div>

      </div>
    </Layout>
  );
}
