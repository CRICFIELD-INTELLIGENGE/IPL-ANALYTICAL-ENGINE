// CricField Arcade Client API Contract

export interface ArcadeGame {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  difficulty: string;
  estimatedMinutes: string;
  icon: string;
  route: string;
  features: string[];
}

export interface HigherLowerPlayer {
  id: string;
  name: string;
  team: string;
  metricLabel: string;
  value?: number;
  displayValue?: string;
}

export interface HigherLowerChallenge {
  id: string;
  metricKey: "strike_rate" | "runs" | "wickets" | "sixes" | "economy";
  metricTitle: string;
  unit: string;
  higherIsBetter: boolean;
  playerA: HigherLowerPlayer;
  playerB: HigherLowerPlayer;
  playerBValue: number;
  playerBDisplayValue: string;
}

export interface CricketerPuzzle {
  id: string;
  name: string;
  clues: [string, string, string, string, string];
  clueLabels: [string, string, string, string, string];
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let errMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) errMessage = `${body.error}: ${body.detail ?? body.message ?? ""}`;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }
  return res.json() as Promise<T>;
}

export async function fetchArcadeGames(): Promise<{ platform: string; gamesCount: number; games: ArcadeGame[] }> {
  return getJson(`/api/arcade/games`);
}

export async function fetchHigherLowerChallenge(): Promise<HigherLowerChallenge> {
  return getJson(`/api/arcade/higher-or-lower/challenge`);
}

export async function submitHigherLowerGuess(payload: {
  challengeId: string;
  metricKey: string;
  playerAValue: number;
  playerBValue: number;
  guess: "higher" | "lower";
}): Promise<{ correct: boolean; playerAValue: number; playerBValue: number; difference: number }> {
  const res = await fetch(`/api/arcade/higher-or-lower/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to evaluate guess");
  return res.json();
}

export async function fetchDailyCricketerPuzzle(date?: string): Promise<CricketerPuzzle> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return getJson(`/api/arcade/guess-cricketer/daily${query}`);
}

export async function fetchRandomCricketerPuzzle(): Promise<CricketerPuzzle> {
  return getJson(`/api/arcade/guess-cricketer/random`);
}

export const ARCADE_GAMES: ArcadeGame[] = [
 {id:"cup-chase",title:"Cup Chase",subtitle:"Time your shot. Chase the cup.",category:"Quick Play",difficulty:"Skill",estimatedMinutes:"3–5 min",icon:"Zap",route:"/arcade/cup-chase",features:["Timing-based batting","Three-round cup","Touch and keyboard"]},
  {
    id: "hand-cricket",
    title: "Hand Cricket",
    subtitle: "Classic schoolyard duel vs AI engine",
    category: "Quick Play",
    difficulty: "Casual",
    estimatedMinutes: "2-5 mins",
    icon: "Hand",
    route: "/arcade/hand-cricket",
    features: ["Toss & Decision", "1, 2, or 5-Over Modes", "Fair Random Engine", "Ball Commentary"],
  },
  {
    id: "higher-or-lower",
    title: "Higher or Lower",
    subtitle: "Test your verified cricket statistics instinct",
    category: "Trivia",
    difficulty: "Medium",
    estimatedMinutes: "3 mins",
    icon: "TrendingUp",
    route: "/arcade/higher-or-lower",
    features: ["Head-to-head metric duel", "Streak Multiplier", "Verified Warehouse Stats", "High Score Tracking"],
  },
  {
    id: "guess-cricketer",
    title: "Guess the Cricketer",
    subtitle: "5 progressive analytical clues",
    category: "Trivia",
    difficulty: "Hard",
    estimatedMinutes: "3 mins",
    icon: "Brain",
    route: "/arcade/guess-cricketer",
    features: ["Daily Puzzle", "Progressive Hint Ladder", "Clue Efficiency Score", "Practice Mode"],
  },
  {
    id: "super-over",
    title: "Super Over Showdown",
    subtitle: "High-leverage 6-ball target chase",
    category: "Quick Play",
    difficulty: "Medium",
    estimatedMinutes: "2 mins",
    icon: "Zap",
    route: "/arcade/super-over",
    features: ["Shot selection vs bowler delivery", "Over tracking HUD", "Dynamic commentary", "Clutch scenarios"],
  },
  {
    id: "build-your-xi",
    title: "Build Your XI",
    subtitle: "Construct a balanced XI within ₹100 Cr purse",
    category: "Strategy",
    difficulty: "Strategic",
    estimatedMinutes: "5-10 mins",
    icon: "Users",
    route: "/arcade/build-your-xi",
    features: ["₹100 Cr Salary Cap", "4 Overseas Player Quota", "Synergy & Balance Audit", "Export XI"],
  },
  {
    id: "auction-room",
    title: "IPL Mega Auction Room",
    subtitle: "Live paddle bidding war vs 9 AI franchises",
    category: "Strategy",
    difficulty: "Expert",
    estimatedMinutes: "10 mins",
    icon: "Gavel",
    route: "/arcade/auction-room",
    features: ["Real franchise purses", "Going once/twice hammer calls", "AI bidding aggression", "Squad haul tracker"],
  },
];
