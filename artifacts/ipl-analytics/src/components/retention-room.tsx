import {RetentionAssessment} from "@/components/scout/retention-assessment";
import DUGOUT_SQUADS_2026 from "@/data/dugout-squads-2026.json";
import { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowRight, Users, Shirt, Search, Shield, Trophy, Check, X, HelpCircle,
  Bookmark, ChevronRight, Info, AlertTriangle, Star, Activity, Sparkles, Filter
} from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { HUB_TEAMS, type HubTeam } from "@/lib/ipl-2027";
import { TEAM_REGISTRY, useTeamTheme } from "@/lib/team-context";
import { retentionKey } from "@/lib/auction-plan";

export type RoleCategory = "All" | "Batters" | "WK" | "All-rounders" | "Pace" | "Spin";

interface PlayerItem {
  id: string;
  name: string;
  role: "Batter" | "Wicketkeeper" | "All-rounder" | "Pace Bowler" | "Spin Bowler";
  roleGroup: RoleCategory;
  nat: string;
  flag: string;
  overseas: boolean;
  stats: string;
  img: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCURATE 2026 PLAYER PHOTO MAP & RESOLVER
// ─────────────────────────────────────────────────────────────────────────────
export const PLAYER_PHOTO_MAP: Record<string, string> = {
  // CSK
  "Ruturaj Gaikwad": "/players/profiles-2026/ruturaj-gaikwad.webp",
  "MS Dhoni": "/players/profiles-2026/ms-dhoni.webp",
  "Ravindra Jadeja": "/players/profiles-2026/ravindra-jadeja.webp",
  "Matheesha Pathirana": "/players/profiles-2026/mateesh-pathirana.webp",
  "Deepak Chahar": "/players/profiles-2026/deepak-chahar.webp",
  "Shivam Dube": "/players/profiles-2026/shivam-dube.webp",
  "Devon Conway": "/players/csk-2026/dewald-brevis.webp",
  "Moeen Ali": "/players/csk-2026/akeal-hosein.webp",
  "Tushar Deshpande": "/players/profiles-2026/tushar-deshpande.webp",
  "Shardul Thakur": "/players/profiles-2026/shardul-thakur.webp",
  "Rachin Ravindra": "/players/profiles-2026/rachin-ravindra.webp",
  "Maheesh Theekshana": "/players/csk-2026/noor-ahmad.webp",
  "Mitchell Santner": "/players/profiles-2026/mitchell-santner.webp",
  "Ajinkya Rahane": "/players/profiles-2026/ajinkya-rahane.webp",
  "Sameer Rizvi": "/players/profiles-2026/sameer-rizvi.webp",
  "Mukesh Choudhary": "/players/profiles-2026/mukesh-choudhary.webp",
  "Simarjeet Singh": "/players/csk-2026/gurjapneet-singh.webp",
  "Rajvardhan Hangargekar": "/players/csk-2026/anshul-kamboj.webp",
  "Prashant Solanki": "/players/profiles-2026/prashant-solanki.webp",
  "Nishant Sindhu": "/players/profiles-2026/nishant-sindhu.webp",
  "Shaik Rasheed": "/players/csk-2026/ayush-mhatre.webp",
  "Aravelly Avanish": "/players/csk-2026/kartik-sharma.webp",
  "Ajay Mandal": "/players/profiles-2026/ajay-mandal.webp",
  "Richard Gleeson": "/players/csk-2026/matt-henry.webp",

  // Key Stars across franchises
  "Virat Kohli": "/players/profiles-2026/virat-kohli.webp",
  "Jasprit Bumrah": "/players/profiles-2026/jasprit-bumrah.webp",
  "Rohit Sharma": "/players/profiles-2026/rohit-sharma.webp",
  "Suryakumar Yadav": "/players/profiles-2026/suryakumar-yadav.webp",
  "Hardik Pandya": "/players/profiles-2026/hardik-pandya.webp",
  "Tilak Varma": "/players/profiles-2026/tilak-varma.webp",
  "Sunil Narine": "/players/profiles-2026/sunil-narine.webp",
  "Rinku Singh": "/players/profiles-2026/rinku-singh.webp",
  "Shreyas Iyer": "/players/profiles-2026/shreyas-iyer.webp",
  "Varun Chakravarthy": "/players/profiles-2026/varun-chakravarthy.webp",
  "Heinrich Klaasen": "/players/profiles-2026/henrich-klassen.webp",
  "Pat Cummins": "/players/profiles-2026/pat-cummins.webp",
  "Travis Head": "/players/profiles-2026/travis-head.webp",
  "Abhishek Sharma": "/players/profiles-2026/abhisek-sharma.webp",
  "Sanju Samson": "/players/profiles-2026/sanju-samson.webp",
  "Yashasvi Jaiswal": "/players/profiles-2026/yashasvi-jaiswal.webp",
  "Riyan Parag": "/players/profiles-2026/riyan-parag.webp",
  "Rishabh Pant": "/players/profiles-2026/risabh-pant.webp",
  "Axar Patel": "/players/profiles-2026/axar-patel.webp",
  "Kuldeep Yadav": "/players/profiles-2026/kuldeep-yadav.webp",
  "Arshdeep Singh": "/players/profiles-2026/arshdeep-singh.webp",
  "Shashank Singh": "/players/profiles-2026/shasank-singh.webp",
  "Shubman Gill": "/players/profiles-2026/shubman-gill.webp",
  "Sai Sudharsan": "/players/profiles-2026/sai-sudharsan.webp",
  "Rashid Khan": "/players/profiles-2026/rashid-khan.webp",
  "Nicholas Pooran": "/players/profiles-2026/nicholas-pooran.webp",
  "Mayank Yadav": "/players/profiles-2026/mayank-yadav.webp",
  "Ravi Bishnoi": "/players/profiles-2026/ravi-bishnoi.webp",
  "KL Rahul": "/players/profiles-2026/kl-rahul.webp",
  "Mohammed Shami": "/players/profiles-2026/mohammad-shami.webp",
  "Mohammed Siraj": "/players/profiles-2026/mohammad-siraj.webp",
  "Rajat Patidar": "/players/profiles-2026/rajat-patidar.webp",
  "Yash Dayal": "/players/profiles-2026/yash-dayal.webp",
  "Mitchell Starc": "/players/profiles-2026/mitchell-starc.webp",
  "Venkatesh Iyer": "/players/profiles-2026/venkatesh-iyer.webp",
  "Bhuvneshwar Kumar": "/players/profiles-2026/bhuvaneswar-kumar.webp",
  "Yuzvendra Chahal": "/players/profiles-2026/yuzvendra-chahal.webp",
  "Harshal Patel": "/players/profiles-2026/harshal-patel.webp",
  "Nitish Kumar Reddy": "/players/profiles-2026/nitish-kumar-reddy.webp",
  "Washington Sundar": "/players/profiles-2026/washington-sundar.webp",
  "Ishan Kishan": "/players/profiles-2026/ishan-kishan.webp",
  "Rahul Tewatia": "/players/profiles-2026/rahul-tewatia.webp",
  "Ayush Badoni": "/players/profiles-2026/ayush-badoni.webp",
  "Ashutosh Sharma": "/players/profiles-2026/ashutosh-sharma.webp",
};

function computeSquadComposition(players: PlayerItem[]) {
  const counts = { batters: 0, wk: 0, allRounders: 0, pace: 0, spin: 0 };
  for (const p of (players || [])) {
    if (p.roleGroup === "Batters") counts.batters++;
    else if (p.roleGroup === "WK") counts.wk++;
    else if (p.roleGroup === "All-rounders") counts.allRounders++;
    else if (p.roleGroup === "Pace") counts.pace++;
    else if (p.roleGroup === "Spin") counts.spin++;
  }
  return counts;
}

export function getPlayerPhoto(name: string, fallback?: string): string {
  if (fallback && fallback !== "/hero-players.png" && fallback !== "" && !fallback.includes("virat kohli.jpg")) {
    return fallback;
  }
  if (PLAYER_PHOTO_MAP[name]) return PLAYER_PHOTO_MAP[name];
  const cleaned = name.trim();
  if (PLAYER_PHOTO_MAP[cleaned]) return PLAYER_PHOTO_MAP[cleaned];
  const kebab = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `/players/profiles-2026/${kebab}.webp`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SQUAD DATASETS FOR EACH FRANCHISE
// ─────────────────────────────────────────────────────────────────────────────
const SQUADS_BY_TEAM: Record<HubTeam, {
  tagline: string;
  avgAge: number;
  dna: { metric: string; value: number }[];
  composition: { batters: number; wk: number; allRounders: number; pace: number; spin: number };
  strengths: string[];
  concerns: string[];
  keyPlayers: { name: string; img: string; role: string }[];
  replacements: { name: string; img: string; role: string; team: string }[];
  players: PlayerItem[];
}> = {
  CSK: {
    tagline: "Build. Decide. Compare. What comes next?",
    avgAge: 29.4,
    dna: [
      { metric: "Top Order", value: 8.2 },
      { metric: "Middle Order", value: 7.8 },
      { metric: "Finishing", value: 7.0 },
      { metric: "Spin", value: 9.1 },
      { metric: "Pace", value: 7.5 },
      { metric: "Flexibility", value: 8.0 },
    ],
    composition: computeSquadComposition(((DUGOUT_SQUADS_2026 as any).CSK || []) as PlayerItem[]),
    strengths: [
      "Experienced core with trophy-winning pedigree",
      "Premier spin resources dialed for Chepauk fortress",
      "Reliable Indian batting depth across middle overs",
    ],
    concerns: [
      "Pace department depth after key injury/release cycles",
      "Middle-order power-hitting against express pace",
      "Identifying next-generation domestic finishers",
    ],
    keyPlayers: [
      { name: "Ruturaj Gaikwad", img: "/players/profiles-2026/ruturaj-gaikwad.webp", role: "Captain & Anchor" },
      { name: "MS Dhoni", img: "/players/profiles-2026/ms-dhoni.webp", role: "Wicketkeeper / Icon" },
      { name: "Sanju Samson", img: "/players/profiles-2026/sanju-samson.webp", role: "Marquee WK-Batter" },
    ],
    replacements: [
      { name: "Abhishek Sharma", img: "/players/profiles-2026/abhisek-sharma.webp", role: "Attacking Opener", team: "SRH" },
      { name: "Mayank Yadav", img: "/players/profiles-2026/mayank-yadav.webp", role: "Express Pacer", team: "LSG" },
      { name: "Ravindra Jadeja", img: "/players/profiles-2026/ravindra-jadeja.webp", role: "Elite All-rounder", team: "RR" },
    ],
    players: ((DUGOUT_SQUADS_2026 as any).CSK || []) as PlayerItem[],
  },
  RCB: {
    tagline: "Defending Champions: Blueprint to sustain supremacy.",
    avgAge: 28.1,
    dna: [
      { metric: "Top Order", value: 9.3 },
      { metric: "Middle Order", value: 7.4 },
      { metric: "Finishing", value: 8.5 },
      { metric: "Spin", value: 7.0 },
      { metric: "Pace", value: 7.8 },
      { metric: "Flexibility", value: 8.1 },
    ],
    composition: computeSquadComposition(((DUGOUT_SQUADS_2026 as any).RCB || []) as PlayerItem[]),
    strengths: [
      "Championship winning momentum & fearless identity",
      "Supreme top-order run volume led by Virat Kohli",
      "Deadly death-overs hitting combinations",
    ],
    concerns: [
      "Chinnaswamy boundary defense under pressure",
      "Specialist spin controller in the middle overs",
      "Over-reliance on top 3 scoring",
    ],
    keyPlayers: [
      { name: "Virat Kohli", img: "/players/profiles-2026/virat-kohli.webp", role: "Top-Order Run Machine" },
      { name: "Rajat Patidar", img: "/players/profiles-2026/rajat-patidar.webp", role: "Middle-Order Aggressor" },
      { name: "Mohammed Siraj", img: "/players/profiles-2026/mohammad-siraj.webp", role: "Pace Spearhead" },
    ],
    replacements: [
      { name: "Yuzvendra Chahal", img: "/players/profiles-2026/yuzvendra-chahal.webp", role: "Wicket-taking Spinner", team: "RR" },
      { name: "Riyan Parag", img: "/players/profiles-2026/riyan-parag.webp", role: "Finisher", team: "RR" },
      { name: "Arshdeep Singh", img: "/players/profiles-2026/arshdeep-singh.webp", role: "Death Bowler", team: "PBKS" },
    ],
    players: ((DUGOUT_SQUADS_2026 as any).RCB || []) as PlayerItem[],
  },
  MI: {
    tagline: "The 5-time Champions: Reclaiming the fortress.",
    avgAge: 27.8,
    dna: [
      { metric: "Top Order", value: 9.0 },
      { metric: "Middle Order", value: 8.6 },
      { metric: "Finishing", value: 8.8 },
      { metric: "Spin", value: 6.8 },
      { metric: "Pace", value: 9.4 },
      { metric: "Flexibility", value: 7.8 },
    ],
    composition: computeSquadComposition(((DUGOUT_SQUADS_2026 as any).MI || []) as PlayerItem[]),
    strengths: [
      "World-class pace battery anchored by Jasprit Bumrah",
      "Explosive Indian middle order with boundary velocity",
      "Deep championship experience and pedigree",
    ],
    concerns: [
      "Specialist wrist-spin penetration",
      "Wankhede surface economy management",
      "Top-order consistency during powerplay",
    ],
    keyPlayers: [
      { name: "Jasprit Bumrah", img: "/players/profiles-2026/jasprit-bumrah.webp", role: "Premier Strike Weapon" },
      { name: "Rohit Sharma", img: "/players/profiles-2026/rohit-sharma.webp", role: "Opening Icon" },
      { name: "Suryakumar Yadav", img: "/players/profiles-2026/suryakumar-yadav.webp", role: "T20 Master" },
    ],
    replacements: [
      { name: "Kagiso Rabada", img: "/players/profiles-2026/kagiso-rabada.webp", role: "Express Pacer", team: "PBKS" },
      { name: "Rahul Chahar", img: "/players/profiles-2026/rahul-chahar.webp", role: "Leg Spinner", team: "PBKS" },
      { name: "Rishabh Pant", img: "/players/profiles-2026/risabh-pant.webp", role: "WK-Batter", team: "DC" },
    ],
    players: ((DUGOUT_SQUADS_2026 as any).MI || []) as PlayerItem[],
  },
  KKR: {
    tagline: "Defending Champions 2024: The aggressive playbook.",
    avgAge: 27.5,
    dna: [
      { metric: "Top Order", value: 8.8 },
      { metric: "Middle Order", value: 8.5 },
      { metric: "Finishing", value: 9.2 },
      { metric: "Spin", value: 9.5 },
      { metric: "Pace", value: 8.0 },
      { metric: "Flexibility", value: 8.7 },
    ],
    composition: computeSquadComposition(((DUGOUT_SQUADS_2026 as any).KKR || []) as PlayerItem[]),
    strengths: [
      "Sunil Narine & Varun Chakravarthy spin stranglehold",
      "Devastating death-over hitting power with Andre Russell",
      "Proactive all-phase strike rates",
    ],
    concerns: [
      "Top-order Indian wicketkeeper reliability",
      "Pace consistency across away venues",
      "Eden Gardens high scoring rate control",
    ],
    keyPlayers: [
      { name: "Sunil Narine", img: "/players/profiles-2026/sunil-narine.webp", role: "MVP All-rounder" },
      { name: "Andre Russell", img: "/players/profiles-2026/andre-russell.webp", role: "Power Finisher" },
      { name: "Rinku Singh", img: "/players/profiles-2026/rinku-singh.webp", role: "Death-overs Finisher" },
    ],
    replacements: [
      { name: "Heinrich Klaasen", img: "/players/profiles-2026/henrich-klassen.webp", role: "Power WK-Batter", team: "SRH" },
      { name: "Mayank Yadav", img: "/players/profiles-2026/mayank-yadav.webp", role: "Express Pacer", team: "LSG" },
      { name: "Tilak Varma", img: "/players/profiles-2026/tilak-varma.webp", role: "Anchor-Hitter", team: "MI" },
    ],
    players: ((DUGOUT_SQUADS_2026 as any).KKR || []) as PlayerItem[],
  },
  SRH: {
    tagline: "The 287-run benchmark: Hyper-aggressive batting.",
    avgAge: 27.1,
    dna: [
      { metric: "Top Order", value: 9.6 },
      { metric: "Middle Order", value: 8.9 },
      { metric: "Finishing", value: 8.2 },
      { metric: "Spin", value: 6.5 },
      { metric: "Pace", value: 8.7 },
      { metric: "Flexibility", value: 7.9 },
    ],
    composition: computeSquadComposition(((DUGOUT_SQUADS_2026 as any).SRH || []) as PlayerItem[]),
    strengths: [
      "Record-breaking 250+ score potential",
      "Travis Head & Abhishek Sharma opening firestorm",
      "Heinrich Klaasen middle-overs carnage",
    ],
    concerns: [
      "Spin containment in high scoring matches",
      "Dependence on flat deck conditions",
      "Bowling depth when Cummins rests",
    ],
    keyPlayers: [
      { name: "Heinrich Klaasen", img: "/players/profiles-2026/henrich-klassen.webp", role: "Middle Order Destroyer" },
      { name: "Travis Head", img: "/players/profiles-2026/travis-head.webp", role: "Powerplay Explosive" },
      { name: "Pat Cummins", img: "/players/profiles-2026/pat-cummins.webp", role: "Captain & Pacer" },
    ],
    replacements: [
      { name: "Jasprit Bumrah", img: "/players/profiles-2026/jasprit-bumrah.webp", role: "Pace Weapon", team: "MI" },
      { name: "Rashid Khan", img: "/players/profiles-2026/rashid-khan.webp", role: "Mystery Spin", team: "GT" },
      { name: "Sanju Samson", img: "/players/profiles-2026/sanju-samson.webp", role: "WK-Batter", team: "CSK" },
    ],
    players: ((DUGOUT_SQUADS_2026 as any).SRH || []) as PlayerItem[],
  },
  RR: {
    tagline: "Royal precision: Deep domestic Indian talent core.",
    avgAge: 26.9,
    dna: [
      { metric: "Top Order", value: 9.1 },
      { metric: "Middle Order", value: 8.4 },
      { metric: "Finishing", value: 8.0 },
      { metric: "Spin", value: 8.9 },
      { metric: "Pace", value: 8.3 },
      { metric: "Flexibility", value: 8.2 },
    ],
    composition: computeSquadComposition(((DUGOUT_SQUADS_2026 as any).RR || []) as PlayerItem[]),
    strengths: [
      "Jaiswal & Parag explosive top-order duo",
      "Ashwin, Chahal & Jadeja world-class spin tandem",
      "Sandeep Sharma & Boult precision execution",
    ],
    concerns: [
      "Lower order boundary finishing depth",
      "Death bowling economy variance",
      "Middle order overreliance on Parag",
    ],
    keyPlayers: [
      { name: "Yashasvi Jaiswal", img: "/players/profiles-2026/yashasvi-jaiswal.webp", role: "Dynamic Opener" },
      { name: "Ravindra Jadeja", img: "/players/profiles-2026/ravindra-jadeja.webp", role: "Elite All-rounder" },
      { name: "Yuzvendra Chahal", img: "/players/profiles-2026/yuzvendra-chahal.webp", role: "Spin Kingpin" },
    ],
    replacements: [
      { name: "Nicholas Pooran", img: "/players/profiles-2026/nicholas-pooran.webp", role: "Left-Handed Destroyer", team: "LSG" },
      { name: "Mohammed Siraj", img: "/players/profiles-2026/mohammad-siraj.webp", role: "Powerplay Wicket-taker", team: "RCB" },
      { name: "Sanju Samson", img: "/players/profiles-2026/sanju-samson.webp", role: "WK-Batter", team: "CSK" },
    ],
    players: ((DUGOUT_SQUADS_2026 as any).RR || []) as PlayerItem[],
  },
  DC: {
    tagline: "Capital resurgence: Dynamic youth and express pace.",
    avgAge: 26.2,
    dna: [
      { metric: "Top Order", value: 8.5 },
      { metric: "Middle Order", value: 8.7 },
      { metric: "Finishing", value: 7.9 },
      { metric: "Spin", value: 8.8 },
      { metric: "Pace", value: 8.4 },
      { metric: "Flexibility", value: 8.3 },
    ],
    composition: computeSquadComposition(((DUGOUT_SQUADS_2026 as any).DC || []) as PlayerItem[]),
    strengths: [
      "Rishabh Pant game-changing wicketkeeper-captain",
      "Kuldeep Yadav & Axar Patel elite spin tandem",
      "Dynamic young Indian batters",
    ],
    concerns: [
      "Death overs economy leakage",
      "Top-order opening stability",
      "Overseas pacer availability and fitness",
    ],
    keyPlayers: [
      { name: "Rishabh Pant", img: "/players/profiles-2026/risabh-pant.webp", role: "Captain & Wicketkeeper" },
      { name: "Kuldeep Yadav", img: "/players/profiles-2026/kuldeep-yadav.webp", role: "Left-Arm Wrist Spinner" },
      { name: "Axar Patel", img: "/players/profiles-2026/axar-patel.webp", role: "Spin All-rounder" },
    ],
    replacements: [
      { name: "Shubman Gill", img: "/players/profiles-2026/shubman-gill.webp", role: "Anchor Opener", team: "GT" },
      { name: "Jasprit Bumrah", img: "/players/profiles-2026/jasprit-bumrah.webp", role: "Death Specialist", team: "MI" },
      { name: "Ruturaj Gaikwad", img: "/players/profiles-2026/ruturaj-gaikwad.webp", role: "Top-Order Captain", team: "CSK" },
    ],
    players: ((DUGOUT_SQUADS_2026 as any).DC || []) as PlayerItem[],
  },
  PBKS: {
    tagline: "Punjab Kings: Emerging fearless finishers & Indian pace.",
    avgAge: 26.5,
    dna: [
      { metric: "Top Order", value: 7.9 },
      { metric: "Middle Order", value: 8.3 },
      { metric: "Finishing", value: 9.0 },
      { metric: "Spin", value: 7.2 },
      { metric: "Pace", value: 8.5 },
      { metric: "Flexibility", value: 8.1 },
    ],
    composition: computeSquadComposition(((DUGOUT_SQUADS_2026 as any).PBKS || []) as PlayerItem[]),
    strengths: [
      "Arshdeep Singh premier T20 left-arm death bowler",
      "Shashank Singh breakthrough late-order fire",
      "Sam Curran seam-bowling all-rounder balance",
    ],
    concerns: [
      "Top-order batting consistency across the season",
      "Specialist spinner wicket volume in middle overs",
      "Closing tight 2-run margins under pressure",
    ],
    keyPlayers: [
      { name: "Arshdeep Singh", img: "/players/profiles-2026/arshdeep-singh.webp", role: "Death Bowling Master" },
      { name: "Shashank Singh", img: "/players/profiles-2026/shasank-singh.webp", role: "Finisher Phenomenon" },
      { name: "Sam Curran", img: "/players/profiles-2026/sam-curran.webp", role: "All-Round Impact" },
    ],
    replacements: [
      { name: "Rohit Sharma", img: "/players/profiles-2026/rohit-sharma.webp", role: "Proven Captain-Opener", team: "MI" },
      { name: "Nicholas Pooran", img: "/players/profiles-2026/nicholas-pooran.webp", role: "Power Middle Hitter", team: "LSG" },
      { name: "Yuzvendra Chahal", img: "/players/profiles-2026/yuzvendra-chahal.webp", role: "Wicket Spinner", team: "RR" },
    ],
    players: ((DUGOUT_SQUADS_2026 as any).PBKS || []) as PlayerItem[],
  },
  GT: {
    tagline: "Gujarat Titans: Tactical discipline & championship poise.",
    avgAge: 27.2,
    dna: [
      { metric: "Top Order", value: 8.7 },
      { metric: "Middle Order", value: 8.2 },
      { metric: "Finishing", value: 8.6 },
      { metric: "Spin", value: 9.2 },
      { metric: "Pace", value: 8.4 },
      { metric: "Flexibility", value: 8.5 },
    ],
    composition: computeSquadComposition(((DUGOUT_SQUADS_2026 as any).GT || []) as PlayerItem[]),
    strengths: [
      "Shubman Gill elite classical accumulation",
      "Rashid Khan world's premier T20 match-winner",
      "Disciplined death-overs execution & tactical match-ups",
    ],
    concerns: [
      "Middle overs scoring acceleration without Miller",
      "Pace spearhead workload management",
      "Indian wicketkeeping depth",
    ],
    keyPlayers: [
      { name: "Shubman Gill", img: "/players/profiles-2026/shubman-gill.webp", role: "Captain & Anchor" },
      { name: "Rashid Khan", img: "/players/profiles-2026/rashid-khan.webp", role: "Global Spin Phenom" },
      { name: "Sai Sudharsan", img: "/players/profiles-2026/sai-sudharsan.webp", role: "Technical Left-Hander" },
    ],
    replacements: [
      { name: "Heinrich Klaasen", img: "/players/profiles-2026/henrich-klassen.webp", role: "Destructive Finisher", team: "SRH" },
      { name: "Arshdeep Singh", img: "/players/profiles-2026/arshdeep-singh.webp", role: "Left-Arm Pacer", team: "PBKS" },
      { name: "Rinku Singh", img: "/players/profiles-2026/rinku-singh.webp", role: "Clutch Chaser", team: "KKR" },
    ],
    players: ((DUGOUT_SQUADS_2026 as any).GT || []) as PlayerItem[],
  },
  LSG: {
    tagline: "Lucknow Super Giants: Express pace & left-handed firepower.",
    avgAge: 26.8,
    dna: [
      { metric: "Top Order", value: 8.4 },
      { metric: "Middle Order", value: 8.8 },
      { metric: "Finishing", value: 8.9 },
      { metric: "Spin", value: 8.3 },
      { metric: "Pace", value: 9.0 },
      { metric: "Flexibility", value: 8.2 },
    ],
    composition: computeSquadComposition(((DUGOUT_SQUADS_2026 as any).LSG || []) as PlayerItem[]),
    strengths: [
      "Mayank Yadav express 156 kph breakthrough pace",
      "Nicholas Pooran supreme six-hitting velocity",
      "Ekana surface tailored tactical spin array",
    ],
    concerns: [
      "Top order strike rate momentum",
      "Pace bowler injury resilience over 14 games",
      "Powerplay bowling wicket counts",
    ],
    keyPlayers: [
      { name: "Nicholas Pooran", img: "/players/profiles-2026/nicholas-pooran.webp", role: "Explosive Wicketkeeper" },
      { name: "Mayank Yadav", img: "/players/profiles-2026/mayank-yadav.webp", role: "155+ kph Express Pacer" },
      { name: "KL Rahul", img: "/players/profiles-2026/kl-rahul.webp", role: "Anchor & Leader" },
    ],
    replacements: [
      { name: "Ravi Bishnoi", img: "/players/profiles-2026/ravi-bishnoi.webp", role: "Googly Specialist", team: "LSG" },
      { name: "Marcus Stoinis", img: "/players/profiles-2026/marcus-stoinis.webp", role: "Power All-rounder", team: "AUS" },
      { name: "Ayush Badoni", img: "/players/profiles-2026/ayush-badoni.webp", role: "360 Degree Hitter", team: "IND" },
    ],
    players: ((DUGOUT_SQUADS_2026 as any).LSG || []) as PlayerItem[],
  },
};

export function RetentionRoom() {
  const [, navigate] = useLocation();
  const { selectedTeam } = useTeamTheme();
  const q = new URLSearchParams(useSearch()).get("team")?.toUpperCase();
  const activeTeam: HubTeam = HUB_TEAMS.includes(q as HubTeam) ? (q as HubTeam) : selectedTeam ?? "CSK";

  const [phaseTab, setPhaseTab] = useState<"pre" | "post">("pre");
  const [roleFilter, setRoleFilter] = useState<RoleCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState<"All" | "IND" | "Overseas">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Retain" | "Release" | "Unsure">("All");
  const [editorialTab, setEditorialTab] = useState("Featured");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Per-team player retention calls state: player.id -> "retain" | "release" | "unsure"
  const [calls, setCalls] = useState<Record<string, "retain" | "release" | "unsure">>({});

  const teamData = SQUADS_BY_TEAM[activeTeam] ?? SQUADS_BY_TEAM.CSK;
  const theme = TEAM_REGISTRY[activeTeam] ?? TEAM_REGISTRY.CSK;
  const editorialStories = [
    { tab: "Featured", tag: "FEATURE", title: `${theme.shortName}'s retention dilemma: Keep the core or build for the future?`, description: `With a strong Indian spine and proven leadership, ${theme.name} face key calls ahead of the 2026/2027 retention deadline.`, date: "CricField Editorial Desk · 26 Oct · 6 min read", img: activeTeam === "CSK" ? "/csk insight.jpg" : activeTeam === "RCB" ? "/rcb-winner-2026.jpg" : "/venue-images/wankhede stadium.webp" },
    { tab: "Analysis", tag: "ANALYSIS", title: `Why ${theme.shortName}'s spin core remains their biggest strength`, description: "", date: "26 Oct · 5 min read", img: "/venue-images/ma chidambaram stadium.webp" },
    { tab: "Team Focus", tag: "TEAM FOCUS", title: `Which young domestic players could shape ${theme.shortName}'s next cycle?`, description: "", date: "25 Oct · 6 min read", img: "/a rahane.jpg" },
    { tab: "Scouting", tag: "SCOUTING", title: `Five overseas options who could interest ${theme.shortName} in the room`, description: "", date: "24 Oct · 5 min read", img: activeTeam === "RR" ? "/players/rr-2026/yashasvi-jaiswal.webp" : "/players/rr-2026/donovan-ferreira.webp" },
  ];
  const leadIndex = Math.max(0, editorialStories.findIndex(story => story.tab === editorialTab));
  const orderedEditorial = [...editorialStories];
  [orderedEditorial[0], orderedEditorial[leadIndex]] = [orderedEditorial[leadIndex], orderedEditorial[0]];
  const leadEditorial = orderedEditorial[0];




  const handleTeamChange = (t: HubTeam | null) => {
    navigate(t ? `/feed/squad?team=${t}` : "/feed/squad");
  };

  const handleCallChange = (playerId: string, call: "retain" | "release" | "unsure") => {
    setCalls((prev) => ({
      ...prev,
      [playerId]: prev[playerId] === call ? "unsure" : call,
    }));
  };

  // Filtered squad list
  const filteredPlayers = useMemo(() => {
    return teamData.players.filter((p) => {
      if (roleFilter !== "All" && p.roleGroup !== roleFilter) return false;
      if (searchQuery.trim() && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (nationalityFilter === "IND" && p.overseas) return false;
      if (nationalityFilter === "Overseas" && !p.overseas) return false;
      const userCall = calls[p.id] ?? "unsure";
      if (statusFilter === "Retain" && userCall !== "retain") return false;
      if (statusFilter === "Release" && userCall !== "release") return false;
      if (statusFilter === "Unsure" && userCall !== "unsure") return false;
      return true;
    });
  }, [teamData.players, roleFilter, searchQuery, nationalityFilter, statusFilter, calls]);

  // Squad Impact metrics
  const impact = useMemo(() => {
    let retained = 0;
    let released = 0;
    let undecided = 0;

    let topOrder = 0;
    let middleOrder = 0;
    let finishers = 0;
    let wk = 0;
    let pace = 0;
    let spin = 0;
    let allRounders = 0;

    teamData.players.forEach((p) => {
      const c = calls[p.id] ?? "unsure";
      if (c === "retain") {
        retained++;
        if (p.role === "Batter") topOrder++;
        if (p.role === "Wicketkeeper") wk++;
        if (p.role === "Pace Bowler") pace++;
        if (p.role === "Spin Bowler") spin++;
        if (p.role === "All-rounder") allRounders++;
        if (p.name.includes("Dhoni") || p.name.includes("Russell") || p.name.includes("Pooran") || p.name.includes("Tewatia")) finishers++;
      } else if (c === "release") {
        released++;
      } else {
        undecided++;
      }
    });

    return {
      retained,
      released,
      undecided,
      topOrder: Math.min(topOrder, 4),
      middleOrder: Math.min(allRounders, 4),
      finishers: Math.min(finishers, 3),
      wk: Math.min(wk, 2),
      pace: Math.min(pace, 5),
      spin: Math.min(spin, 4),
      allRounders: Math.min(allRounders, 4),
    };
  }, [teamData.players, calls]);

  const handleSavePicks = () => {
    try {
      localStorage.setItem(retentionKey(activeTeam), JSON.stringify({
        team: activeTeam,
        savedAt: new Date().toISOString(),
        players: teamData.players.filter(p => calls[p.id] === "retain").map(p => ({ name: p.name, role: p.role, overseas: p.overseas })),
      }));
    } catch {
      setSaveMessage("Could not save picks. Browser storage is unavailable.");
      return;
    }
    setSaveMessage(`✓ Saved ${impact.retained} retentions for ${theme.name}`);
    setTimeout(() => setSaveMessage(null), 3500);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-[#040814] min-h-screen text-white font-sans">
      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER + IPL JOURNEY STEPPER */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] items-start">
        {/* Left: Title & Subtitle */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Link href="/feed" className="hover:text-white transition-colors">Feed</Link>
            <span>›</span>
            <span className="franchise-eyebrow font-medium">Squad Building</span>
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-md bg-[var(--team-accent)]/15 border border-[var(--team-accent)]/30 text-[10px] font-mono uppercase tracking-widest text-[var(--team-accent)] font-bold">
            IPL 2027 UPCOMING
          </div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
            THE RETENTION <span className="text-[var(--team-accent)]">ROOM</span>
          </h1>
          <p className="text-sm sm:text-base font-bold text-white/90">
            {teamData.tagline}
          </p>
          <p className="text-xs sm:text-sm text-white/60 max-w-xl leading-relaxed">
            Explore each franchise's squad DNA, pick your retentions, build your playing XI and find the best replacements — all in one place.
          </p>
        </div>

        {/* Right: Journey Stepper Card */}
        <div className="rounded-2xl border border-white/10 bg-[#0B1226]/80 p-5 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-white/80">
              IPL 2027 JOURNEY
            </span>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setPhaseTab("pre")}
                className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase transition-all ${
                  phaseTab === "pre" ? "bg-violet-600 text-white shadow" : "text-white/60 hover:text-white"
                }`}
              >
                Pre-Retention
              </button>
              <button
                onClick={() => setPhaseTab("post")}
                className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase transition-all ${
                  phaseTab === "post" ? "bg-violet-600 text-white shadow" : "text-white/60 hover:text-white"
                }`}
              >
                Post-Retention
              </button>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="relative pt-2 pb-1">
            <div className="absolute top-[18px] left-3 right-3 h-[2px] bg-white/10" />
            <div className="relative z-10 grid grid-cols-4 gap-2 text-center">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-[var(--team-accent)] ring-4 ring-[var(--team-accent)]/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-black" />
                </div>
                <span className="mt-2 text-[10px] font-black text-[var(--team-accent)] leading-tight">Pre-Retention</span>
                <span className="text-[9px] text-white/40">Analysis & Predictions</span>
                <span className="text-[9px] font-mono text-white/30">1 Nov 2026</span>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-[#0B1226] border-2 border-white/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                </div>
                <span className="mt-2 text-[10px] font-bold text-white/70 leading-tight">Retention Window</span>
                <span className="text-[9px] text-white/40">Deadline</span>
                <span className="text-[9px] font-mono text-white/30">15 Nov 2026</span>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-[#0B1226] border-2 border-white/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                </div>
                <span className="mt-2 text-[10px] font-bold text-white/70 leading-tight">Official Lists</span>
                <span className="text-[9px] text-white/40">Announcement</span>
                <span className="text-[9px] font-mono text-white/30">16–22 Nov</span>
              </div>
              {/* Step 4 */}
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-[#0B1226] border-2 border-white/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                </div>
                <span className="mt-2 text-[10px] font-bold text-white/70 leading-tight">Auction</span>
                <span className="text-[9px] text-white/40">Mega Event</span>
                <span className="text-[9px] font-mono text-white/30">16 Dec 2026</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-2.5 text-[11px] text-white/60 border border-white/5">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>You are viewing the pre-retention phase. Actual retention squads will be revealed after official announcements.</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 2. FRANCHISE SELECTOR BAR */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <nav aria-label="Franchise selector" className="-mx-4 overflow-x-auto px-4 py-1 no-scrollbar">
        <div className="flex items-center gap-2 w-max">
          <button
            onClick={() => handleTeamChange(null)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              !q ? "bg-white/20 text-white border border-white/30" : "bg-white/[0.04] text-white/70 hover:text-white border border-white/10"
            }`}
          >
            ALL TEAMS
          </button>
          {HUB_TEAMS.map((t) => {
            const tm = TEAM_REGISTRY[t];
            const isSelected = activeTeam === t;
            return (
              <button
                key={t}
                onClick={() => handleTeamChange(t)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-black transition-all ${
                  isSelected
                    ? "bg-[#0B1226] border-[var(--team-accent)] text-white ring-2 ring-[var(--team-accent)]/30 shadow-lg"
                    : "bg-white/[0.03] border-white/10 text-white/70 hover:border-white/30 hover:text-white"
                }`}
              >
                <img src={tm.logoImg} alt={tm.shortName} className="w-5 h-5 object-contain" />
                <span>{t}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 3. 3D STADIUM STAGE / HERO INTERACTIVE CENTERPIECE */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <section className="relative rounded-[28px] border border-white/15 bg-gradient-to-b from-[#0B1536] via-[#070D22] to-[#040817] p-6 lg:p-8 overflow-hidden shadow-2xl">
        {/* Stadium light flares & ambient background glow */}
        <div className="absolute top-0 left-1/4 w-96 h-48 bg-sky-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-48 bg-purple-500/10 blur-[100px] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(ellipse at 50% 100%, rgba(184, 243, 107, 0.25) 0%, transparent 60%)"
          }}
        />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[200px_1fr_220px] items-center">
          {/* Left Wing: Team Crest artwork & Change Team */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-3">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-40"
                style={{ backgroundColor: theme.accent }}
              />
              <img
                src={theme.logoImg}
                alt={theme.name}
                className="relative z-10 w-28 h-28 object-contain drop-shadow-2xl"
              />
            </div>
            <div className="text-sm font-black uppercase text-white tracking-wide">
              {theme.shortName}
            </div>
            <button
              onClick={() => handleTeamChange(activeTeam === "CSK" ? "RCB" : "CSK")}
              className="px-3.5 py-1.5 rounded-full bg-[var(--team-accent)] hover:brightness-110 text-black text-xs font-black transition-all shadow-md"
            >
              Change Team
            </button>
          </div>

          {/* Center Stage: The 3 Glowing Action Pods on Circular Arena Pitch */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Pod 01: Pick Your Retentions (Amber) */}
            <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-500/15 via-[#0C142C]/90 to-[#070D1E] p-4 flex flex-col justify-between shadow-lg relative group hover:border-amber-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                  01
                </span>
                <Users className="w-4 h-4 text-amber-300" />
              </div>
              <div className="mt-3">
                <h2 className="text-sm font-black uppercase tracking-wide text-white">
                  Pick Your Retentions
                </h2>
                <p className="text-[11px] text-white/60 mt-1 leading-snug">
                  Choose who stays, who goes and shape {theme.shortName}'s next chapter.
                </p>
              </div>

              {/* Player Avatars */}
              <div className="my-4 flex items-center justify-center gap-2">
                {teamData.keyPlayers.map((kp) => (
                  <div key={kp.name} className="flex flex-col items-center">
                    <img
                      src={getPlayerPhoto(kp.name, kp.img)}
                      alt={kp.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/hero-players.png";
                      }}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-amber-400/60 shadow"
                    />
                    <span className="mt-1 text-[9px] text-white/70 font-semibold truncate max-w-[54px] text-center">
                      {kp.name.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>

              <a
                href="#squad-table"
                className="w-full py-2 rounded-xl bg-[#FACC15] hover:bg-[#FDE047] text-black text-center text-xs font-black transition-all shadow flex items-center justify-center gap-1.5"
              >
                Make Your Picks <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Pod 02: Build Your Playing XI (Cyan / Elevated) */}
            <div className="rounded-2xl border border-cyan-400/50 bg-gradient-to-b from-cyan-500/20 via-[#0C142C]/90 to-[#070D1E] p-4 flex flex-col justify-between shadow-xl relative group hover:border-cyan-400 transition-all sm:-translate-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-black text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/30">
                  02
                </span>
                <Shirt className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="mt-3">
                <h2 className="text-sm font-black uppercase tracking-wide text-white">
                  Build Your Playing XI
                </h2>
                <p className="text-[11px] text-white/60 mt-1 leading-snug">
                  Create your ideal XI from the available squad.
                </p>
              </div>

              {/* Mini Cricket Formation Field Graphic */}
              <div className="my-3 py-2 px-3 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center gap-1.5">
                <div className="flex gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15] ring-2 ring-white/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15] ring-2 ring-white/30" />
                </div>
                <div className="flex gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15] ring-2 ring-white/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15] ring-2 ring-white/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15] ring-2 ring-white/30" />
                </div>
                <div className="flex gap-5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15] ring-2 ring-white/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15] ring-2 ring-white/30" />
                </div>
                <div className="flex gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15] ring-2 ring-white/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15] ring-2 ring-white/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15] ring-2 ring-white/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15] ring-2 ring-white/30" />
                </div>
              </div>

              <Link
                href="/arcade/build-your-xi"
                className="w-full py-2 rounded-xl bg-sky-500/20 border border-sky-400 text-sky-300 hover:bg-sky-500/30 text-center text-xs font-black transition-all flex items-center justify-center gap-1.5"
              >
                Build Your XI <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Pod 03: Explore Replacements (Purple) */}
            <div className="rounded-2xl border border-purple-400/40 bg-gradient-to-b from-purple-500/15 via-[#0C142C]/90 to-[#070D1E] p-4 flex flex-col justify-between shadow-lg relative group hover:border-purple-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-black text-purple-300 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/30">
                  03
                </span>
                <Search className="w-4 h-4 text-purple-300" />
              </div>
              <div className="mt-3">
                <h2 className="text-sm font-black uppercase tracking-wide text-white">
                  Explore Replacements
                </h2>
                <p className="text-[11px] text-white/60 mt-1 leading-snug">
                  Find players who could fill the gaps if key names leave.
                </p>
              </div>

              {/* Candidate Replacement Avatars */}
              <div className="my-4 flex items-center justify-center gap-2">
                {teamData.replacements.map((rp) => (
                  <div key={rp.name} className="flex flex-col items-center">
                    <img
                      src={getPlayerPhoto(rp.name, rp.img)}
                      alt={rp.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/hero-players.png";
                      }}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-400/60 shadow"
                    />
                    <span className="mt-1 text-[9px] text-white/70 font-semibold truncate max-w-[54px] text-center">
                      {rp.name.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href="/scout"
                className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-center text-xs font-black transition-all shadow flex items-center justify-center gap-1.5"
              >
                Find Replacements <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Wing: Trophy & CSK At A Glance Card */}
          <div className="flex flex-col items-center lg:items-end space-y-3">
            {/* Trophy */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full" />
              <img
                src="/ipl-trophy-cup.jpg"
                alt="IPL Trophy"
                className="relative z-10 w-20 h-20 object-contain drop-shadow"
              />
            </div>

            {/* At a glance box */}
            <div className="w-full rounded-2xl border border-white/10 bg-[#090E20]/90 p-3.5 space-y-2 text-xs backdrop-blur-md">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 mb-2">
                {theme.shortName} AT A GLANCE
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" /> Squad Size
                </span>
                <span className="font-mono font-bold text-white">{teamData.players.length}</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span className="flex items-center gap-1.5">
                  <span className="text-xs">🇮🇳</span> Indian Players
                </span>
                <span className="font-mono font-bold text-white">
                  {teamData.players.filter((p) => !p.overseas).length}
                </span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span className="flex items-center gap-1.5">
                  <span className="text-xs">✈️</span> Overseas Players
                </span>
                <span className="font-mono font-bold text-white">
                  {teamData.players.filter((p) => p.overseas).length}
                </span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" /> Avg. Age
                </span>
                <span className="font-mono font-bold text-white">{teamData.avgAge}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Curved Embossed Stadium Arena Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <span className="text-xs sm:text-sm font-black uppercase tracking-[0.35em] text-white/20 select-none">
            {theme.name}
          </span>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 4. SQUAD DNA (RADAR + COMPOSITION DONUT) & KEY STRENGTHS/CONCERNS */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: Squad DNA Card */}
        <div className="rounded-2xl border border-white/10 bg-[#0B1226]/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${theme.accent}30` }}
              >
                <img src={theme.logoImg} alt="" className="w-4 h-4 object-contain" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">SQUAD DNA</h3>
                <p className="text-[11px] text-white/50">What makes {theme.shortName}'s squad unique?</p>
              </div>
            </div>
            <Link
              href={`/dugout/${activeTeam.toLowerCase()}`}
              className="text-[11px] font-bold text-violet-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              View Full Squad Analysis <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 items-center">
            {/* Radar Chart */}
            <div className="h-[210px] w-full min-h-[210px] relative">
              <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                <RadarChart data={teamData.dna} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="rgba(255,255,255,0.12)" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: 700 }}
                  />
                  <Radar
                    name={theme.shortName}
                    dataKey="value"
                    stroke="#FACC15"
                    fill="#FACC15"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Donut Chart & Squad Composition */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/60 block">
                SQUAD COMPOSITION ({teamData.players.length} PLAYERS)
              </span>

              <div className="flex items-center gap-4">
                {/* SVG Donut */}
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#1E293B" strokeWidth="14" />
                    {/* Batters */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="14"
                      strokeDasharray="80 160"
                      strokeDashoffset="0"
                    />
                    {/* WK */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="14"
                      strokeDasharray="30 210"
                      strokeDashoffset="-80"
                    />
                    {/* All-rounders */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#A855F7"
                      strokeWidth="14"
                      strokeDasharray="40 200"
                      strokeDashoffset="-110"
                    />
                    {/* Pace */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#EC4899"
                      strokeWidth="14"
                      strokeDasharray="50 190"
                      strokeDashoffset="-150"
                    />
                    {/* Spin */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#A3E635"
                      strokeWidth="14"
                      strokeDasharray="38 202"
                      strokeDashoffset="-200"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-black text-white leading-none">
                      {teamData.players.length}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-white/50">Players</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-1 text-[11px] flex-1">
                  <div className="flex items-center justify-between text-white/80">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#38BDF8]" /> Batters
                    </span>
                    <span className="font-mono font-bold">{teamData.composition.batters}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/80">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#06B6D4]" /> Wicketkeepers
                    </span>
                    <span className="font-mono font-bold">{teamData.composition.wk}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/80">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#A855F7]" /> All-rounders
                    </span>
                    <span className="font-mono font-bold">{teamData.composition.allRounders}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/80">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#EC4899]" /> Pace Bowlers
                    </span>
                    <span className="font-mono font-bold">{teamData.composition.pace}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/80">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#A3E635]" /> Spin Bowlers
                    </span>
                    <span className="font-mono font-bold">{teamData.composition.spin}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/60">
                <span>Indian Players: <strong className="text-white font-mono">{teamData.players.filter((p) => !p.overseas).length}</strong></span>
                <span>Overseas Players: <strong className="text-white font-mono">{teamData.players.filter((p) => p.overseas).length}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Key Strengths & Key Concerns Card */}
        <div className="rounded-2xl border border-white/10 bg-[#0B1226]/80 p-5 backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-2.5">
              KEY STRENGTHS
            </span>
            <ul className="space-y-2">
              {teamData.strengths.map((str) => (
                <li key={str} className="flex items-start gap-2 text-xs text-white/85">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                    ✓
                  </span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-3 border-t border-white/5">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block mb-2.5">
              KEY CONCERNS
            </span>
            <ul className="space-y-2">
              {teamData.concerns.map((con) => (
                <li key={con} className="flex items-start gap-2 text-xs text-white/85">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 mt-0.5">
                    !
                  </span>
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 5. CSK SQUAD (IPL 2026 PRE-RETENTION) TABLE & YOUR SQUAD IMPACT */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div id="squad-table" className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-start scroll-mt-20">
        {/* Left: Squad Table */}
        <div className="rounded-2xl border border-white/10 bg-[#0B1226]/80 p-5 backdrop-blur-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                {theme.shortName} SQUAD (IPL 2026)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--team-accent)]/20 text-[var(--team-accent)] border border-[var(--team-accent)]/30">
                2026
              </span>
            </div>
            <span className="text-[11px] font-mono text-white/40">
              Showing {filteredPlayers.length} of {teamData.players.length}
            </span>
          </div>

          {/* Role Filters */}
          <div className="flex flex-wrap gap-1.5">
            {(["All", "Batters", "WK", "All-rounders", "Pace", "Spin"] as RoleCategory[]).map((rc) => {
              const count =
                rc === "All"
                  ? teamData.players.length
                  : teamData.players.filter((p) => p.roleGroup === rc).length;
              return (
                <button
                  key={rc}
                  onClick={() => setRoleFilter(rc)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    roleFilter === rc
                      ? "bg-violet-600 text-white shadow"
                      : "bg-white/[0.04] text-white/60 hover:text-white border border-white/5"
                  }`}
                >
                  {rc} <span className="font-mono text-[10px] opacity-75">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/40" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/30"
              />
            </div>
            <select
              value={nationalityFilter}
              onChange={(e) => setNationalityFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="All">All Nationalities</option>
              <option value="IND">Indian Only</option>
              <option value="Overseas">Overseas Only</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Retain">Retained Only</option>
              <option value="Release">Released Only</option>
              <option value="Unsure">Undecided Only</option>
            </select>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] text-[10px] font-black uppercase text-white/50 tracking-wider">
                <tr>
                  <th className="p-3">Player</th>
                  <th className="p-3">Role</th>
                  <th className="p-3 text-center">Nat</th>
                  <th className="p-3">IPL 2026 Stats</th>
                  <th className="p-3 text-right">Your Call</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredPlayers.map((player) => {
                  const call = calls[player.id] ?? "unsure";
                  return (
                    <tr key={player.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 flex items-center gap-2.5">
                        <img
                          src={getPlayerPhoto(player.name, player.img)}
                          alt={player.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/hero-players.png";
                          }}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                        />
                        <span className="font-bold text-white">{player.name}</span>
                        <RetentionAssessment name={player.name} role={player.role}/>
                      </td>
                      <td className="p-3 text-white/70">{player.role}</td>
                      <td className="p-3 text-center text-sm">{player.flag}</td>
                      <td className="p-3 text-white/60 font-mono text-[11px]">{player.stats}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleCallChange(player.id, "retain")}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              call === "retain"
                                ? "bg-[var(--team-accent)] text-black font-black shadow"
                                : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            Retain
                          </button>
                          <button
                            onClick={() => handleCallChange(player.id, "release")}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              call === "release"
                                ? "bg-rose-600 text-white font-black shadow"
                                : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            Release
                          </button>
                          <button
                            onClick={() => handleCallChange(player.id, "unsure")}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              call === "unsure"
                                ? "bg-white/20 text-white"
                                : "bg-white/[0.02] text-white/40 hover:text-white"
                            }`}
                          >
                            Unsure
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Your Squad Impact Card (Sticky, No Stretched Gap) */}
        <div className="rounded-2xl border border-white/10 bg-[#0B1226]/80 p-5 backdrop-blur-xl sticky top-24 self-start space-y-4 shadow-xl">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[var(--team-accent)]" />
                YOUR SQUAD IMPACT
              </h3>
              <span className="text-[10px] font-mono font-bold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-white/50 mt-1">
              Real-time balance & role depth based on your retentions.
            </p>

            {/* Stat Counters */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-2.5">
                <span className="text-[9px] uppercase font-bold text-sky-300 block">Retained</span>
                <span className="text-xl font-black text-white font-mono">{impact.retained}</span>
              </div>
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-2.5">
                <span className="text-[9px] uppercase font-bold text-rose-300 block">Released</span>
                <span className="text-xl font-black text-white font-mono">{impact.released}</span>
              </div>
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-2.5">
                <span className="text-[9px] uppercase font-bold text-amber-300 block">Undecided</span>
                <span className="text-xl font-black text-white font-mono">{impact.undecided}</span>
              </div>
            </div>

            {/* Quick Metrics Bar: Remaining Purse & RTM Slots */}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <span className="text-white/50 text-[10px] uppercase font-semibold">Max Retentions</span>
                <span className="font-mono font-black text-emerald-400">6 Slots</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <span className="text-white/50 text-[10px] uppercase font-semibold">RTM Cards Left</span>
                <span className="font-mono font-black text-amber-300">{Math.max(0, 6 - impact.retained)} RTM</span>
              </div>
            </div>

            {/* Role Coverage Progress Bars */}
            <div className="mt-4 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/60 block">
                ROLE COVERAGE (BASED ON CURRENT PICKS)
              </span>

              {[
                { label: "Top Order", val: impact.topOrder, max: 4, color: "bg-sky-400" },
                { label: "Middle Order", val: impact.middleOrder, max: 4, color: "bg-purple-400" },
                { label: "Finishers", val: impact.finishers, max: 3, color: "bg-rose-400" },
                { label: "Wicketkeepers", val: impact.wk, max: 2, color: "bg-cyan-400" },
                { label: "Pace Bowlers", val: impact.pace, max: 5, color: "bg-blue-400" },
                { label: "Spin Bowlers", val: impact.spin, max: 4, color: "bg-lime-400" },
                { label: "All-rounders", val: impact.allRounders, max: 4, color: "bg-amber-400" },
              ].map((rc) => (
                <div key={rc.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-white/80">
                    <span>{rc.label}</span>
                    <span className="font-mono text-white/50">{rc.val}/{rc.max}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${rc.color} transition-all duration-300`}
                      style={{ width: `${(rc.val / rc.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Start picking players to see how your choices affect squad balance and role coverage.</span>
            </div>

            {saveMessage && (
              <div className="text-center text-xs font-bold text-emerald-400 py-1">
                {saveMessage}
              </div>
            )}

            <button
              onClick={handleSavePicks}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Bookmark className="w-4 h-4" /> Save My Picks
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 6. EDITORIAL COVERAGE & RELATED TOOLS */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Left: Editorial Coverage */}
        <div className="rounded-2xl border border-white/10 bg-[#0B1226]/80 p-5 backdrop-blur-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              EDITORIAL COVERAGE
            </h3>
            <div className="flex items-center gap-1 text-[11px]">
              {["Featured", "Analysis", "Team Focus", "Scouting"].map((t) => (
                <button
                  key={t}
                  onClick={() => setEditorialTab(t)}
                  aria-pressed={editorialTab === t}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    editorialTab === t
                      ? "bg-violet-600/30 text-white border border-violet-400/40"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Link
              href={`/dugout/${activeTeam.toLowerCase()}`}
              className="text-[11px] font-bold text-violet-300 hover:text-white flex items-center gap-1"
            >
              View all articles <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
            {/* Big Lead Card */}
            <Link href={`/dugout/${activeTeam.toLowerCase()}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] hover:border-white/25 transition-all flex flex-col justify-between">
              <div className="relative aspect-video w-full overflow-hidden bg-black/50">
                <img src={leadEditorial.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-violet-600 text-white text-[9px] font-black uppercase tracking-wider">{leadEditorial.tag}</span>
              </div>
              <div className="p-4 space-y-2">
                <h4 className="font-bold text-sm sm:text-base text-white group-hover:underline leading-snug">{leadEditorial.title}</h4>
                <p className="text-xs text-white/60 line-clamp-2">{leadEditorial.description}</p>
                <div className="text-[10px] text-white/40 pt-1">{leadEditorial.date}</div>
              </div>
            </Link>
            {/* 3 Stacked Compact Stories */}
            <div className="flex flex-col justify-between space-y-2.5">
              {orderedEditorial.slice(1).map((story,i)=>(
                <Link key={i} href={`/dugout/${activeTeam.toLowerCase()}`} className="group flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all">
                  <img src={story.img} alt="" className="w-20 aspect-video rounded-lg object-cover ring-1 ring-white/10 shrink-0" />
                  <div className="min-w-0 flex-1"><span className="text-[9px] font-black uppercase tracking-widest text-[var(--team-accent)]">{story.tag}</span><h5 className="text-xs font-bold text-white group-hover:underline line-clamp-2 mt-0.5 leading-snug">{story.title}</h5><span className="text-[10px] text-white/40 mt-1 block">{story.date}</span></div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Related Tools */}
        <div className="rounded-2xl border border-white/10 bg-[#0B1226]/80 p-5 backdrop-blur-xl flex flex-col justify-between space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-white mb-1">
            RELATED TOOLS
          </h3>

          <div className="space-y-2.5">
            <Link
              href={`/dugout/${activeTeam.toLowerCase()}`}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{theme.shortName} Team Dugout</span>
                  <span className="text-[10px] text-white/45">Full squad, stats and history</span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
            </Link>

            <Link
              href="/feed/ipl-2027?module=gaps"
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Squad Explorer</span>
                  <span className="text-[10px] text-white/45">Explore player list and filters</span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
            </Link>

            <Link
              href="/scout"
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Global Scout Engine</span>
                  <span className="text-[10px] text-white/45">Find and compare targets</span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
            </Link>

            <Link
              href="/pulse#auction"
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Follow on Pulse</span>
                  <span className="text-[10px] text-white/45">Official retention announcements</span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
