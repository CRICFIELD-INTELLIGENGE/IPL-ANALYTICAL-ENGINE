// One fan poll per franchise: the question and its options. Votes are recorded
// per browser (see components/dugout/fan-parliament-card.tsx). There are no
// seeded vote counts or evidence figures here: the earlier version showed
// percentages and statistics that were not computed from the record.

import type { TeamCode } from "@/lib/team-context";

export interface FanPoll {
  question: string;
  category: string;
  options: { id: string; text: string }[];
}

export const FAN_POLLS: Record<TeamCode, FanPoll> = {
  RCB: {
    question: "Who is RCB's most critical retention priority for 2027?",
    category: "SQUAD MANDATE",
    options: [
      { id: "kohli", text: "Virat Kohli" },
      { id: "patidar", text: "Rajat Patidar" },
      { id: "pace", text: "A pace spearhead (Mohammed Siraj or an express seamer)" },
      { id: "overseas", text: "A death-overs overseas specialist" },
    ],
  },
  CSK: {
    question: "How should CSK split their purse between retentions and the open auction?",
    category: "AUCTION WAR ROOM",
    options: [
      { id: "core", text: "Retain five capped core players" },
      { id: "marquee", text: "Retain three marquee players and keep RTM flexibility" },
      { id: "uncapped", text: "Keep money for an uncapped specialist and death bowling" },
    ],
  },
  MI: {
    question: "What is MI's biggest tactical gap to fix before the next season?",
    category: "TACTICAL VOID",
    options: [
      { id: "seamer", text: "A second express seamer to partner Jasprit Bumrah" },
      { id: "spinner", text: "A reliable Indian middle-overs wrist spinner" },
      { id: "finisher", text: "An aggressive overseas finisher" },
    ],
  },
  KKR: {
    question: "Should KKR keep the high-risk boundary approach or add anchor stability?",
    category: "TACTICAL IDENTITY",
    options: [
      { id: "boundary", text: "Keep the all-out boundary approach" },
      { id: "anchor", text: "Add an Indian anchor at No. 3" },
    ],
  },
  SRH: {
    question: "What turns SRH's explosive batting into sustained consistency?",
    category: "STRATEGIC BALANCE",
    options: [
      { id: "death", text: "Upgrade death-overs bowling" },
      { id: "reserves", text: "Deepen Indian batting reserves" },
    ],
  },
  RR: {
    question: "Which retention decision gives Rajasthan Royals the highest ceiling?",
    category: "RETENTION BLUEPRINT",
    options: [
      { id: "top3", text: "Lock the top three of Samson, Jaiswal and Parag" },
      { id: "spinners", text: "Prioritise two world-class spinners" },
      { id: "seamers", text: "Reserve a large purse for death seamers at auction" },
    ],
  },
  DC: {
    question: "What is Delhi Capitals' primary target profile for the next war room?",
    category: "SCOUT LAB",
    options: [
      { id: "allrounder", text: "A proven Indian pace-bowling all-rounder" },
      { id: "yorker", text: "An express international yorker specialist" },
      { id: "finisher", text: "An elite wicketkeeper-finisher" },
    ],
  },
  PBKS: {
    question: "How should Punjab Kings shape their tactical philosophy?",
    category: "CULTURE & TACTICS",
    options: [
      { id: "young", text: "Back young Indian finishers with full trust" },
      { id: "marquee", text: "Sign a marquee international captain" },
    ],
  },
  GT: {
    question: "Should Gujarat Titans prioritise batting firepower or keep bowling control?",
    category: "IDENTITY RADAR",
    options: [
      { id: "bowling", text: "Keep the bowling-suffocation profile" },
      { id: "batting", text: "Pivot to powerplay boundary aggression" },
    ],
  },
  LSG: {
    question: "What is Lucknow's top priority for home-ground optimisation at Ekana?",
    category: "VENUE OPTIMIZATION",
    options: [
      { id: "spin", text: "Wrist-spin and slower-ball options for black soil" },
      { id: "pace", text: "Express pace on high-bounce red soil" },
    ],
  },
};
