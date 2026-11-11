// Arcade Passport — game catalogue, XP, levels and achievements. Cosmetic only: nothing here has cash value.

export type GameId =
  | "cup-chase" | "hand-cricket" | "super-over" | "higher-or-lower" | "guess-cricketer" | "build-your-xi" | "auction-room"
  | "cricket-grid" | "time-machine" | "drs" | "next-ball" | "captains-call" | "scout-gem" | "franchise-gm";

export type Category = "Quick Play" | "Puzzles & Stats" | "Strategy" | "Daily Arena" | "Decision Arena" | "Tactical Lab" | "Franchise Career";

export interface GameInfo {
  id: GameId; title: string; tagline: string; category: Category; genre: string; difficulty: string; minutes: string;
  /** What the leaderboard ranks, so unrelated games are never mixed. */
  scoreLabel: string; daily?: boolean; resumable?: boolean;
}

export const GAMES: GameInfo[] = [
  { id: "cup-chase", title: "Cup Chase", tagline: "One button. Time your swing. Keep your garden innings alive.", category: "Quick Play", genre: "Real-time batting", difficulty: "Skill", minutes: "3–5", scoreLabel: "Runs" },
  { id: "hand-cricket", title: "Hand Cricket", tagline: "The notebook classic against four schoolyard rivals.", category: "Quick Play", genre: "Schoolyard duel", difficulty: "Casual", minutes: "2–5", scoreLabel: "Match points" },
  { id: "super-over", title: "Super Over Showdown", tagline: "Six balls, two wickets, one target. Read the field.", category: "Quick Play", genre: "Tactical batting", difficulty: "Pressure", minutes: "2–3", scoreLabel: "Chase points" },
  { id: "higher-or-lower", title: "Higher or Lower", tagline: "Two verified records. Which is bigger?", category: "Puzzles & Stats", genre: "Stats puzzle", difficulty: "Medium", minutes: "3", scoreLabel: "Streak", daily: true },
  { id: "guess-cricketer", title: "Guess the Cricketer", tagline: "Open the locker clue by clue. Name the player.", category: "Puzzles & Stats", genre: "Identity puzzle", difficulty: "Hard", minutes: "3", scoreLabel: "Clue score", daily: true },
  { id: "build-your-xi", title: "Build Your XI", tagline: "Pick, balance and order a side that actually works.", category: "Strategy", genre: "Team selection", difficulty: "Strategic", minutes: "5–10", scoreLabel: "Team rating", resumable: true },
  { id: "auction-room", title: "Mega Auction Room", tagline: "Raise the paddle against nine disciplined rivals.", category: "Strategy", genre: "Auction strategy", difficulty: "Expert", minutes: "10–20", scoreLabel: "Squad rating", resumable: true },
  { id: "cricket-grid", title: "Cricket Grid", tagline: "Nine cells. Every player must fit both clues.", category: "Daily Arena", genre: "Knowledge grid", difficulty: "Hard", minutes: "5", scoreLabel: "Cells + rarity", daily: true },
  { id: "time-machine", title: "IPL Time Machine", tagline: "Travel season by season through the scrapbook.", category: "Daily Arena", genre: "History trivia", difficulty: "Medium", minutes: "5", scoreLabel: "Chapter score" },
  { id: "next-ball", title: "Predict the Next Ball", tagline: "A real IPL moment. What happened next?", category: "Daily Arena", genre: "Prediction", difficulty: "Medium", minutes: "3", scoreLabel: "Prediction points", daily: true },
  { id: "drs", title: "DRS: You Decide", tagline: "Simulated LBW reviews. Pitching, impact, wickets.", category: "Decision Arena", genre: "Umpiring", difficulty: "Medium", minutes: "4", scoreLabel: "Review points" },
  { id: "captains-call", title: "Captain's Call", tagline: "Bowler, plan, field. Then live with it.", category: "Tactical Lab", genre: "Tactics", difficulty: "Hard", minutes: "4", scoreLabel: "Decision points" },
  { id: "scout-gem", title: "Scout the Hidden Gem", tagline: "A real shortlist, a budget, and your reasoning.", category: "Tactical Lab", genre: "Analytics", difficulty: "Hard", minutes: "5", scoreLabel: "Scouting points" },
  { id: "franchise-gm", title: "Franchise GM", tagline: "Retain, buy, select and survive a simulated season.", category: "Franchise Career", genre: "Management sim", difficulty: "Deep", minutes: "20+", scoreLabel: "Season points", resumable: true },
];
export const gameInfo = (id: string) => GAMES.find((g) => g.id === id);

/** Level n needs 100·(n−1)² XP. */
export const levelFor = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
export const xpForLevel = (level: number) => 100 * (level - 1) ** 2;

/** XP per validated session: participation + performance, capped per session. */
export function xpForSession(game: GameId, score: number, won: boolean): number {
  const base = 10 + (won ? 15 : 0);
  const perf = Math.min(40, Math.max(0, Math.round(score / (game === "higher-or-lower" ? 0.5 : game === "cup-chase" ? 2.5 : 5))));
  return base + perf;
}
export const DAILY_XP_CAP_PER_GAME = 250;
export const DAILY_SCORED_SESSIONS_PER_GAME = 25;

export interface Achievement { code: string; name: string; description: string }
export const ACHIEVEMENTS: Achievement[] = [
  { code: "last-ball-hero", name: "Last Ball Hero", description: "Win a Super Over or a Cup Chase round off the very last ball." },
  { code: "schoolyard-champion", name: "Schoolyard Champion", description: "Win the Hand Cricket Schoolyard Tournament." },
  { code: "stat-detective", name: "Stat Detective", description: "Reach a 10-answer streak in Higher or Lower." },
  { code: "auction-mastermind", name: "Auction Mastermind", description: "Finish an auction with a valid squad rated 80+." },
  { code: "perfect-xi", name: "Perfect XI", description: "Submit a valid XI rated 85+ in Build Your XI." },
  { code: "umpires-eye", name: "Umpire's Eye", description: "Get all ten DRS reviews right in one session." },
  { code: "cricket-historian", name: "Cricket Historian", description: "Score 5/5 in five Time Machine chapters." },
  { code: "tactical-genius", name: "Tactical Genius", description: "Pick the best-estimated plan in Captain's Call three times." },
  { code: "grid-master", name: "Grid Master", description: "Fill all nine cells of a Cricket Grid." },
  { code: "mystery-solved", name: "Locker Cracker", description: "Name the mystery cricketer from the first two clues." },
];
