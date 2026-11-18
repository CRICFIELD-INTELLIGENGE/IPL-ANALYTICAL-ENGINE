import type React from "react";
import {
  Award,
  BookOpen,
  Brain,
  Compass,
  Flame,
  GraduationCap,
  Rocket,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { EditorialAspectId } from "@/data/editorial/schema";

export const ANGLE_TO_ASPECT: Record<string, EditorialAspectId> = {
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

export interface AngleCategory {
  id: string;
  label: string;
  shortLabel: string;
  badgeCount: number;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  bgActive: string;
}

export const INTELLIGENCE_ANGLES: AngleCategory[] = [
  { id: "all", label: "All Articles", shortLabel: "All", badgeCount: 100, icon: BookOpen, color: "text-cyan-400", borderColor: "border-cyan-500/30", bgActive: "bg-cyan-500/20" },
  { id: "batting", label: "Batting Editorials", shortLabel: "Batting", badgeCount: 10, icon: Flame, color: "text-rose-400", borderColor: "border-rose-500/30", bgActive: "bg-rose-500/20" },
  { id: "bowling", label: "Bowling & Fielding", shortLabel: "Bowling", badgeCount: 10, icon: Target, color: "text-blue-400", borderColor: "border-blue-500/30", bgActive: "bg-blue-500/20" },
  { id: "tactical", label: "Tactical & Match", shortLabel: "Tactical", badgeCount: 10, icon: Compass, color: "text-purple-400", borderColor: "border-purple-500/30", bgActive: "bg-purple-500/20" },
  { id: "auction", label: "Auction & Economics", shortLabel: "Auction", badgeCount: 10, icon: Award, color: "text-pink-400", borderColor: "border-pink-500/30", bgActive: "bg-pink-500/20" },
  { id: "business", label: "Business & Revenue", shortLabel: "Business", badgeCount: 10, icon: TrendingUp, color: "text-emerald-400", borderColor: "border-emerald-500/30", bgActive: "bg-emerald-500/20" },
  { id: "culture", label: "Fan Culture", shortLabel: "Culture", badgeCount: 10, icon: Users, color: "text-amber-400", borderColor: "border-amber-500/30", bgActive: "bg-amber-500/20" },
  { id: "history", label: "History & Legacy", shortLabel: "History", badgeCount: 10, icon: ShieldCheck, color: "text-teal-400", borderColor: "border-teal-500/30", bgActive: "bg-teal-500/20" },
  { id: "development", label: "Player Development", shortLabel: "Scouting", badgeCount: 10, icon: GraduationCap, color: "text-cyan-400", borderColor: "border-cyan-500/30", bgActive: "bg-cyan-500/20" },
  { id: "datascience", label: "Data Science", shortLabel: "Data", badgeCount: 10, icon: Brain, color: "text-indigo-400", borderColor: "border-indigo-500/30", bgActive: "bg-indigo-500/20" },
  { id: "future", label: "Future Strategy", shortLabel: "Future", badgeCount: 10, icon: Rocket, color: "text-lime-400", borderColor: "border-lime-500/30", bgActive: "bg-lime-500/20" },
];

export interface FranchiseIntelligenceData {
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
    featuredPlayer: "Abhishek Sharma",
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
    featuredPlayer: "MS Dhoni",
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
    featuredPlayer: "Rohit Sharma",
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
    featuredPlayer: "Sunil Narine",
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
    heroImage: "/players/rr-2026/riyan-parag.webp",
    stadiumImage: "/venue-images/sawai mansingh jaipur stadium.webp",
    featuredPlayer: "Riyan Parag",
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
    heroImage: "/players/dc-2026/kl-rahul.webp",
    stadiumImage: "/arun jaitely stadium.webp",
    featuredPlayer: "KL Rahul",
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
    heroImage: "/players/pbks-2026/shreyas-iyer.webp",
    stadiumImage: "/is bindra stadium.jpg",
    featuredPlayer: "Shreyas Iyer",
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
    heroImage: "/players/gt-2026/shubman-gill.webp",
    stadiumImage: "/narendra modi stadium.webp",
    featuredPlayer: "Shubman Gill",
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
    heroImage: "/players/lsg-2026/nicholas-pooran.webp",
    stadiumImage: "/lucknow stadium.webp",
    featuredPlayer: "Nicholas Pooran",
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

export const SEASONS = ["2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017"];
