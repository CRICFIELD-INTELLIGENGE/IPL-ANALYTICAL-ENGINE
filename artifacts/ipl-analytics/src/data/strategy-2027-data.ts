/**
 * IPL 2027 Strategy & Intelligence Newsroom Dataset
 * 
 * Creative Directive:
 * "Don't tell me what happened. Tell me what teams are preparing to do next."
 * 
 * Positioning:
 * - Feed: "What's happening and what's changing?"
 * - Intel Hub: "What does the data predict?"
 * - On-Field: "What actually happened?"
 * - Insights: "What does it mean?"
 */

export interface WarRoomTeam {
  id: string;
  code: string;
  name: string;
  color: string;
  primaryBg: string;
  border: string;
  bat: number;
  bowl: number;
  depth: number;
  finish: number;
  overallRating: number;
  budgetPurseCr: number;
  primaryObjective: string;
  headline: string;
}

export const WAR_ROOM_TEAMS: WarRoomTeam[] = [
  {
    id: "rcb",
    code: "RCB",
    name: "Royal Challengers Bengaluru",
    color: "#EF4444",
    primaryBg: "from-red-600/20 to-amber-500/10",
    border: "border-red-500/40",
    bat: 92,
    bowl: 82,
    depth: 84,
    finish: 90,
    overallRating: 88,
    budgetPurseCr: 42.5,
    primaryObjective: "Preserve top-order violence while locking in specialist death overs containment.",
    headline: "Correcting death overs leak after maiden 2026 championship."
  },
  {
    id: "csk",
    code: "CSK",
    name: "Chennai Super Kings",
    color: "#FACC15",
    primaryBg: "from-amber-400/20 to-yellow-600/10",
    border: "border-amber-400/40",
    bat: 84,
    bowl: 88,
    depth: 91,
    finish: 78,
    overallRating: 86,
    budgetPurseCr: 51.0,
    primaryObjective: "Transitioning toward bowling-first control & securing high-impact death wicket-takers.",
    headline: "Pivot to bowling stranglehold and middle-order rebuild."
  },
  {
    id: "mi",
    code: "MI",
    name: "Mumbai Indians",
    color: "#3B82F6",
    primaryBg: "from-blue-600/20 to-cyan-500/10",
    border: "border-blue-500/40",
    bat: 90,
    bowl: 85,
    depth: 76,
    finish: 93,
    overallRating: 87,
    budgetPurseCr: 38.0,
    primaryObjective: "Stockpile Indian domestic pace depth & stabilize #4 anchor slot against spin.",
    headline: "Restoring Wankhede pace fortress and lower-order pyrotechnics."
  },
  {
    id: "gt",
    code: "GT",
    name: "Gujarat Titans",
    color: "#1E3A8A",
    primaryBg: "from-indigo-900/30 to-slate-800/20",
    border: "border-indigo-400/40",
    bat: 82,
    bowl: 89,
    depth: 88,
    finish: 81,
    overallRating: 85,
    budgetPurseCr: 46.0,
    primaryObjective: "Targeting high-velocity domestic quicks suited for Ahmedabad bounce.",
    headline: "Engineering discipline: Suffocation tactics in middle overs."
  },
  {
    id: "kkr",
    code: "KKR",
    name: "Kolkata Knight Riders",
    color: "#A855F7",
    primaryBg: "from-purple-600/20 to-amber-500/10",
    border: "border-purple-500/40",
    bat: 89,
    bowl: 86,
    depth: 85,
    finish: 88,
    overallRating: 87,
    budgetPurseCr: 35.5,
    primaryObjective: "Doubling down on ultra-high boundary percentage over anchor preservation.",
    headline: "All-out boundary rate maximization across all 20 overs."
  },
  {
    id: "rr",
    code: "RR",
    name: "Rajasthan Royals",
    color: "#EC4899",
    primaryBg: "from-pink-600/20 to-blue-600/10",
    border: "border-pink-500/40",
    bat: 87,
    bowl: 87,
    depth: 80,
    finish: 82,
    overallRating: 84,
    budgetPurseCr: 44.0,
    primaryObjective: "Rebuilding lower middle-order engine to capitalize on explosive top-3.",
    headline: "Maximizing powerplay run rate and wrist-spin dominance."
  },
  {
    id: "srh",
    code: "SRH",
    name: "Sunrisers Hyderabad",
    color: "#F97316",
    primaryBg: "from-orange-600/20 to-red-600/10",
    border: "border-orange-500/40",
    bat: 95,
    bowl: 79,
    depth: 82,
    finish: 86,
    overallRating: 86,
    budgetPurseCr: 40.0,
    primaryObjective: "Calibrating bowling economy on highway pitches without losing 250+ batting firepower.",
    headline: "Hyper-aggressive batting paradigm seeking bowling floor."
  },
  {
    id: "dc",
    code: "DC",
    name: "Delhi Capitals",
    color: "#0284C7",
    primaryBg: "from-cyan-600/20 to-blue-700/10",
    border: "border-cyan-500/40",
    bat: 83,
    bowl: 84,
    depth: 86,
    finish: 79,
    overallRating: 83,
    budgetPurseCr: 55.0,
    primaryObjective: "Recruiting genuine pace bowling leadership & dependable finisher archetype.",
    headline: "Re-architecting squad balance with massive auction flexibility."
  },
  {
    id: "lsg",
    code: "LSG",
    name: "Lucknow Super Giants",
    color: "#06B6D4",
    primaryBg: "from-teal-600/20 to-cyan-700/10",
    border: "border-teal-400/40",
    bat: 81,
    bowl: 85,
    depth: 82,
    finish: 80,
    overallRating: 82,
    budgetPurseCr: 48.0,
    primaryObjective: "Speed gun focus (150kmph+) paired with high-efficiency spin strangulation at Ekana.",
    headline: "Speed and spin choke: Tailored specifically for sluggish tracks."
  },
  {
    id: "pbks",
    code: "PBKS",
    name: "Punjab Kings",
    color: "#E11D48",
    primaryBg: "from-rose-600/20 to-amber-600/10",
    border: "border-rose-500/40",
    bat: 85,
    bowl: 81,
    depth: 78,
    finish: 87,
    overallRating: 83,
    budgetPurseCr: 58.5,
    primaryObjective: "High-variance big-hitting identity seeking clutch match-finishing consistency.",
    headline: "Highest available purse deploying aggressive analytics reconstruction."
  }
];

// SECTION 2: 2026 -> 2027 TRANSFORMATION PROFILES
export interface TeamTransformation {
  teamCode: string;
  teamName: string;
  dna2026: {
    point1: string;
    point2: string;
    point3: string;
  };
  plan2027: {
    area: string;
    delta: string;
    deltaNum: number;
    color: string;
  }[];
  storyQuote: string;
  editorialInsight: string;
}

export const TEAM_TRANSFORMATIONS: Record<string, TeamTransformation> = {
  RCB: {
    teamCode: "RCB",
    teamName: "Royal Challengers Bengaluru",
    dna2026: {
      point1: "Aggressive top order with boundary-heavy tempo",
      point2: "Death bowling economy volatility (>11.2 RR)",
      point3: "Extreme reliance on frontline XI with thin bench depth"
    },
    plan2027: [
      { area: "DEATH BOWLING", delta: "+18", deltaNum: 18, color: "text-emerald-400" },
      { area: "SQUAD DEPTH", delta: "+11", deltaNum: 11, color: "text-cyan-400" },
      { area: "SPIN OPTIONS", delta: "+7", deltaNum: 7, color: "text-amber-400" }
    ],
    storyQuote: "RCB isn't rebuilding. They're correcting specific weaknesses.",
    editorialInsight: "The front office is abandoning the classic star-heavy formula in favor of 3 interchangeable death specialists, mitigating Chinnaswamy's notorious 19th and 20th over carnage."
  },
  CSK: {
    teamCode: "CSK",
    teamName: "Chennai Super Kings",
    dna2026: {
      point1: "Masterful middle-overs spin choke & match control",
      point2: "Declining death-overs wicket strike rate (18%)",
      point3: "Pace attack vulnerable away from slow Chepauk surfaces"
    },
    plan2027: [
      { area: "DEATH WICKETS", delta: "+24", deltaNum: 24, color: "text-emerald-400" },
      { area: "HIGH-PACE SLING", delta: "+16", deltaNum: 16, color: "text-cyan-400" },
      { area: "TOP-ORDER SR", delta: "+9", deltaNum: 9, color: "text-amber-400" }
    ],
    storyQuote: "CSK is engineering a bowling-first masterclass with young slinging quicks.",
    editorialInsight: "Transitioning toward lethal sling-arm pace to secure back-end dismissals without compromising the spin suffocator template at Chepauk."
  },
  MI: {
    teamCode: "MI",
    teamName: "Mumbai Indians",
    dna2026: {
      point1: "Fearsome boundary power in overs 15-20",
      point2: "Middle-order vulnerability when facing wrist-spin",
      point3: "Over-reliance on Bumrah to clean up transitional overs"
    },
    plan2027: [
      { area: "PACE DEPTH", delta: "+15", deltaNum: 15, color: "text-emerald-400" },
      { area: "FINISHING POWER", delta: "+12", deltaNum: 12, color: "text-cyan-400" },
      { area: "SPIN RESISTANCE", delta: "+14", deltaNum: 14, color: "text-amber-400" }
    ],
    storyQuote: "MI is fortifying Bumrah's supporting cast to eliminate middle-over leakages.",
    editorialInsight: "Scouting metrics focus on domestic 140kmph hit-the-deck pacers and aggressive left-handers who neutralize turning deliveries through mid-wicket."
  },
  GT: {
    teamCode: "GT",
    teamName: "Gujarat Titans",
    dna2026: {
      point1: "Methodical anchor play and tight game-management",
      point2: "Powerplay boundary ceiling lower than league median",
      point3: "Dependence on Rashid Khan to create wicket breakthroughs"
    },
    plan2027: [
      { area: "POWERPLAY SR", delta: "+21", deltaNum: 21, color: "text-emerald-400" },
      { area: "SEAM VELOCITY", delta: "+13", deltaNum: 13, color: "text-cyan-400" },
      { area: "BENCH REDUNDANCY", delta: "+8", deltaNum: 8, color: "text-amber-400" }
    ],
    storyQuote: "GT is injecting vertical bat acceleration into their disciplined tactical core.",
    editorialInsight: "Ahmedabad's vast boundary dimensions require 145kmph express seam and fearless powerplay hitters who take on the infield arms."
  },
  KKR: {
    teamCode: "KKR",
    teamName: "Kolkata Knight Riders",
    dna2026: {
      point1: "Ruthless all-phase boundary aggression and spin choke",
      point2: "Susceptibility to short-pitch bowling traps",
      point3: "High purse expenditure on aging overseas icons"
    },
    plan2027: [
      { area: "INDIAN CORE", delta: "+19", deltaNum: 19, color: "text-emerald-400" },
      { area: "SHORT BALL DEFENSE", delta: "+11", deltaNum: 11, color: "text-cyan-400" },
      { area: "DEATH VARIETY", delta: "+10", deltaNum: 10, color: "text-amber-400" }
    ],
    storyQuote: "KKR is institutionalizing Narine/Russell replacement contingency protocols.",
    editorialInsight: "Locking down next-gen pinch-hitters and mystery spinners from domestic circuits to ensure their aggressive mathematical edge persists post-transition."
  }
};

// SECTION 3: TEAM DNA PROFILES
export interface TeamDNA {
  teamCode: string;
  teamName: string;
  attack: number;
  depth: number;
  finishing: number;
  pace: number;
  spin: number;
  experience: number;
  strategicIdentity: string;
  badgeStyle: string;
}

export const TEAM_DNA_PROFILES: Record<string, TeamDNA> = {
  RCB: {
    teamCode: "RCB",
    teamName: "Royal Challengers Bengaluru",
    attack: 92,
    depth: 84,
    finishing: 90,
    pace: 82,
    spin: 67,
    experience: 91,
    strategicIdentity: "Aggressive batting + elite finishing + pace-heavy attack",
    badgeStyle: "bg-red-500/20 text-red-300 border-red-500/40"
  },
  CSK: {
    teamCode: "CSK",
    teamName: "Chennai Super Kings",
    attack: 81,
    depth: 91,
    finishing: 80,
    pace: 79,
    spin: 94,
    experience: 96,
    strategicIdentity: "Spin stranglehold + tactical deep batting + match tempo control",
    badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-500/40"
  },
  MI: {
    teamCode: "MI",
    teamName: "Mumbai Indians",
    attack: 91,
    depth: 78,
    finishing: 93,
    pace: 92,
    spin: 71,
    experience: 89,
    strategicIdentity: "Fast bowling intimidation + boundary ceiling + ruthless death hitting",
    badgeStyle: "bg-blue-500/20 text-blue-300 border-blue-500/40"
  },
  GT: {
    teamCode: "GT",
    teamName: "Gujarat Titans",
    attack: 80,
    depth: 89,
    finishing: 82,
    pace: 88,
    spin: 87,
    experience: 83,
    strategicIdentity: "Bowling discipline + defensive efficiency + calculated low-risk chases",
    badgeStyle: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
  },
  KKR: {
    teamCode: "KKR",
    teamName: "Kolkata Knight Riders",
    attack: 94,
    depth: 85,
    finishing: 89,
    pace: 78,
    spin: 93,
    experience: 88,
    strategicIdentity: "Hyper-aggressive intent + dual mystery spin + boundary maximization",
    badgeStyle: "bg-purple-500/20 text-purple-300 border-purple-500/40"
  },
  RR: {
    teamCode: "RR",
    teamName: "Rajasthan Royals",
    attack: 88,
    depth: 79,
    finishing: 81,
    pace: 85,
    spin: 90,
    experience: 84,
    strategicIdentity: "Top-order blitzkrieg + wrist-spin wizardry + flexible bowling entry points",
    badgeStyle: "bg-pink-500/20 text-pink-300 border-pink-500/40"
  },
  SRH: {
    teamCode: "SRH",
    teamName: "Sunrisers Hyderabad",
    attack: 97,
    depth: 82,
    finishing: 86,
    pace: 80,
    spin: 72,
    experience: 81,
    strategicIdentity: "250+ run rate obsession + unrestricted boundary hunting + fearless intent",
    badgeStyle: "bg-orange-500/20 text-orange-300 border-orange-500/40"
  },
  DC: {
    teamCode: "DC",
    teamName: "Delhi Capitals",
    attack: 84,
    depth: 86,
    finishing: 80,
    pace: 83,
    spin: 82,
    experience: 80,
    strategicIdentity: "Youth energy + versatile multi-utility all-rounders + auction reload",
    badgeStyle: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
  },
  LSG: {
    teamCode: "LSG",
    teamName: "Lucknow Super Giants",
    attack: 82,
    depth: 81,
    finishing: 83,
    pace: 87,
    spin: 86,
    experience: 82,
    strategicIdentity: "Express 150kmph velocity + Ekana spin trap + anchor-and-accelerate",
    badgeStyle: "bg-teal-500/20 text-teal-300 border-teal-500/40"
  },
  PBKS: {
    teamCode: "PBKS",
    teamName: "Punjab Kings",
    attack: 86,
    depth: 78,
    finishing: 88,
    pace: 83,
    spin: 75,
    experience: 78,
    strategicIdentity: "High-variance power-hitting + purse leverage + aggressive rebuild",
    badgeStyle: "bg-rose-500/20 text-rose-300 border-rose-500/40"
  }
};

// SECTION 4: THE MISSING PIECE
export interface MissingPiece {
  teamCode: string;
  teamName: string;
  missingRole: string;
  currentStatLabel: string;
  currentStatVal: string;
  targetStatLabel: string;
  targetStatVal: string;
  potentialSolution: string;
  status: "WATCH" | "CRITICAL" | "SURPLUS";
  statusColor: string;
}

export const MISSING_PIECES: MissingPiece[] = [
  {
    teamCode: "CSK",
    teamName: "Chennai Super Kings",
    missingRole: "Death-Over Wicket Taker",
    currentStatLabel: "Death wickets share",
    currentStatVal: "18%",
    targetStatLabel: "Target rate",
    targetStatVal: "25%+",
    potentialSolution: "Specialist death sling bowler (145kmph yorker execution)",
    status: "WATCH",
    statusColor: "bg-amber-500/20 text-amber-300 border-amber-500/40"
  },
  {
    teamCode: "RCB",
    teamName: "Royal Challengers Bengaluru",
    missingRole: "Middle-Overs Mystery Spin Controller",
    currentStatLabel: "Overs 7-15 economy",
    currentStatVal: "8.85 RR",
    targetStatLabel: "Target economy",
    targetStatVal: "< 7.40 RR",
    potentialSolution: "Aggressive wrist-spinner with deceptive wrong-un",
    status: "CRITICAL",
    statusColor: "bg-red-500/20 text-red-300 border-red-500/40"
  },
  {
    teamCode: "MI",
    teamName: "Mumbai Indians",
    missingRole: "Spin-Neutralizing #4 LHB Anchor",
    currentStatLabel: "Middle-order SR vs spin",
    currentStatVal: "131.8",
    targetStatLabel: "Target SR",
    targetStatVal: "155.0+",
    potentialSolution: "High-strike-rate left-handed middle aggressor",
    status: "WATCH",
    statusColor: "bg-amber-500/20 text-amber-300 border-amber-500/40"
  },
  {
    teamCode: "GT",
    teamName: "Gujarat Titans",
    missingRole: "Powerplay Infield Blaster",
    currentStatLabel: "Overs 1-6 run rate",
    currentStatVal: "7.92 RR",
    targetStatLabel: "Target run rate",
    targetStatVal: "9.50+ RR",
    potentialSolution: "Uncapped boundary-hunting opener",
    status: "CRITICAL",
    statusColor: "bg-red-500/20 text-red-300 border-red-500/40"
  },
  {
    teamCode: "KKR",
    teamName: "Kolkata Knight Riders",
    missingRole: "Domestic Hit-the-Deck Fast Bowler",
    currentStatLabel: "Pace economy in middle",
    currentStatVal: "9.45 RR",
    targetStatLabel: "Target economy",
    targetStatVal: "< 8.20 RR",
    potentialSolution: "Tall 140k Indian pacer with steep back-of-length bounce",
    status: "WATCH",
    statusColor: "bg-amber-500/20 text-amber-300 border-amber-500/40"
  },
  {
    teamCode: "SRH",
    teamName: "Sunrisers Hyderabad",
    missingRole: "Defensive Anchor Bowler (Highway Stopper)",
    currentStatLabel: "First innings runs conceded",
    currentStatVal: "208 avg",
    targetStatLabel: "Target conceded",
    targetStatVal: "< 185 avg",
    potentialSolution: "Discipline-first seam bowler with cutters & wide lines",
    status: "CRITICAL",
    statusColor: "bg-red-500/20 text-red-300 border-red-500/40"
  }
];

// SECTION 5: "IF I WERE THE GM" SQUAD LAB SIMULATION
export interface GmSimulationOption {
  id: string;
  name: string;
  role: string;
  budgetCr: number;
  expectedRatingGain: number;
  projectedPlayoffDelta: number;
  expectedWinsGain: number;
  weaknessSolved: string;
  archetype: string;
}

export const GM_SQUAD_LAB_OPTIONS: Record<string, GmSimulationOption[]> = {
  CSK: [
    {
      id: "csk-opt-1",
      name: "Specialist Overseas Death Bowler",
      role: "Pace / Death Specialist",
      budgetCr: 12.5,
      expectedRatingGain: 8.4,
      projectedPlayoffDelta: 6.2,
      expectedWinsGain: 1.2,
      weaknessSolved: "Death-overs wicket strike rate & back-end leakages",
      archetype: "Matheesha Pathirana / Spencer Johnson archetype"
    },
    {
      id: "csk-opt-2",
      name: "High-Impact 200+ SR Top Order Enforcer",
      role: "Top-Order Batter",
      budgetCr: 9.0,
      expectedRatingGain: 5.1,
      projectedPlayoffDelta: 4.0,
      expectedWinsGain: 0.8,
      weaknessSolved: "Powerplay run rate stagnation against high pace",
      archetype: "Phil Salt / Travis Head prototype"
    },
    {
      id: "csk-opt-3",
      name: "Indian Seam-Bowling All-Rounder",
      role: "All-Rounder",
      budgetCr: 14.0,
      expectedRatingGain: 6.8,
      projectedPlayoffDelta: 5.3,
      expectedWinsGain: 1.0,
      weaknessSolved: "Impact Player tactical flexibility & 6th bowling insurance",
      archetype: "Shardul Thakur / Nitish Reddy archetype"
    }
  ],
  RCB: [
    {
      id: "rcb-opt-1",
      name: "Elite Indian Wrist-Spinner",
      role: "Spin / Middle Controller",
      budgetCr: 11.0,
      expectedRatingGain: 9.1,
      projectedPlayoffDelta: 7.5,
      expectedWinsGain: 1.4,
      weaknessSolved: "Middle-overs spin choke at Chinnaswamy",
      archetype: "Yuzvendra Chahal / Ravi Bishnoi archetype"
    },
    {
      id: "rcb-opt-2",
      name: "Yorker-Execution Overseas Quick",
      role: "Fast Bowler",
      budgetCr: 13.5,
      expectedRatingGain: 8.2,
      projectedPlayoffDelta: 6.8,
      expectedWinsGain: 1.3,
      weaknessSolved: "Overs 18-20 death run leaks",
      archetype: "Lockie Ferguson / Josh Hazlewood archetype"
    }
  ],
  MI: [
    {
      id: "mi-opt-1",
      name: "Dynamic LHB Spin Destroyer (#4)",
      role: "Middle-Order Batter",
      budgetCr: 10.0,
      expectedRatingGain: 7.6,
      projectedPlayoffDelta: 5.8,
      expectedWinsGain: 1.1,
      weaknessSolved: "Middle-order collapse against quality finger-spin",
      archetype: "Tilak Varma / Nicholas Pooran prototype"
    },
    {
      id: "mi-opt-2",
      name: "145kmph Domestic Indian Enforcer",
      role: "Pace Bowler",
      budgetCr: 8.5,
      expectedRatingGain: 6.4,
      projectedPlayoffDelta: 4.9,
      expectedWinsGain: 0.9,
      weaknessSolved: "Reducing sole burden on Jasprit Bumrah",
      archetype: "Mayank Yadav / Mohit Avasthi archetype"
    }
  ]
};

// SECTION 6: TACTICAL BATTLES (HEAD-TO-HEAD STRATEGY COMPARISON)
export interface TacticalBattle {
  teamA: string;
  teamB: string;
  categories: {
    name: string;
    scoreA: number;
    scoreB: number;
  }[];
  advantage: string;
  analysisVerdict: string;
}

export const TACTICAL_BATTLES: TacticalBattle[] = [
  {
    teamA: "CSK",
    teamB: "RCB",
    categories: [
      { name: "POWERPLAY", scoreA: 82, scoreB: 91 },
      { name: "MIDDLE OVERS", scoreA: 90, scoreB: 84 },
      { name: "DEATH OVERS", scoreA: 68, scoreB: 91 },
      { name: "BENCH DEPTH", scoreA: 88, scoreB: 74 },
      { name: "SPIN CONTROL", scoreA: 94, scoreB: 67 },
      { name: "CHASE EFFICIENCY", scoreA: 86, scoreB: 89 }
    ],
    advantage: "RCB",
    analysisVerdict: "RCB holds significant advantages in Powerplay acceleration and Death execution, while CSK dominates Middle-Overs spin control and tactical bench depth. In a 2027 neutral venue shootout, RCB's finishing ceiling edges CSK."
  },
  {
    teamA: "MI",
    teamB: "CSK",
    categories: [
      { name: "POWERPLAY", scoreA: 89, scoreB: 82 },
      { name: "MIDDLE OVERS", scoreA: 84, scoreB: 90 },
      { name: "DEATH OVERS", scoreA: 92, scoreB: 68 },
      { name: "BENCH DEPTH", scoreA: 78, scoreB: 88 },
      { name: "SPIN CONTROL", scoreA: 71, scoreB: 94 },
      { name: "CHASE EFFICIENCY", scoreA: 91, scoreB: 86 }
    ],
    advantage: "MI",
    analysisVerdict: "MI's raw pace firepower and late-innings strike rate give them the upper hand in high-scoring chases, whereas CSK relies on squeezing the run flow through overs 7 to 15."
  },
  {
    teamA: "KKR",
    teamB: "GT",
    categories: [
      { name: "POWERPLAY", scoreA: 94, scoreB: 80 },
      { name: "MIDDLE OVERS", scoreA: 91, scoreB: 88 },
      { name: "DEATH OVERS", scoreA: 88, scoreB: 85 },
      { name: "BENCH DEPTH", scoreA: 85, scoreB: 89 },
      { name: "SPIN CONTROL", scoreA: 93, scoreB: 87 },
      { name: "CHASE EFFICIENCY", scoreA: 87, scoreB: 84 }
    ],
    advantage: "KKR",
    analysisVerdict: "KKR's uncompromising boundary-first strategy overpowers GT's low-risk containment formula, creating high volatility that historically favors KKR on batting tracks."
  }
];

// SECTION 7: 2027 PLAYING XI PUZZLE CANDIDATES & SLOTS
export interface PuzzlePlayer {
  id: string;
  name: string;
  photo: string;
  role: "OPENER" | "MIDDLE" | "FINISHER" | "ALL_ROUNDER" | "BOWLER";
  batHand: "LHB" | "RHB";
  bowlType: "Pace" | "Spin" | "None";
  isOverseas: boolean;
  batRating: number;
  bowlRating: number;
  rating: number;
  franchise: string;
}

export const PUZZLE_PLAYER_POOL: PuzzlePlayer[] = [
  { id: "p1", name: "Virat Kohli", photo: "/virat kohli.jpg", role: "OPENER", batHand: "RHB", bowlType: "None", isOverseas: false, batRating: 96, bowlRating: 20, rating: 95, franchise: "RCB" },
  { id: "p2", name: "Rohit Sharma", photo: "/rohit sharma.jpg", role: "OPENER", batHand: "RHB", bowlType: "None", isOverseas: false, batRating: 92, bowlRating: 15, rating: 91, franchise: "MI" },
  { id: "p3", name: "Abhishek Sharma", photo: "/abhisek sharma.jpg", role: "OPENER", batHand: "LHB", bowlType: "Spin", isOverseas: false, batRating: 93, bowlRating: 55, rating: 89, franchise: "SRH" },
  { id: "p4", name: "Ruturaj Gaikwad", photo: "/csk insight.jpg", role: "OPENER", batHand: "RHB", bowlType: "None", isOverseas: false, batRating: 90, bowlRating: 10, rating: 88, franchise: "CSK" },
  { id: "p5", name: "Sanju Samson", photo: "/sanju samson.jpg", role: "MIDDLE", batHand: "RHB", bowlType: "None", isOverseas: false, batRating: 91, bowlRating: 10, rating: 90, franchise: "RR" },
  { id: "p6", name: "Suryakumar Yadav", photo: "/advance stats title image.png", role: "MIDDLE", batHand: "RHB", bowlType: "None", isOverseas: false, batRating: 97, bowlRating: 10, rating: 96, franchise: "MI" },
  { id: "p7", name: "Heinrich Klaasen", photo: "/live feed image.png", role: "MIDDLE", batHand: "RHB", bowlType: "None", isOverseas: true, batRating: 95, bowlRating: 10, rating: 94, franchise: "SRH" },
  { id: "p8", name: "Nicholas Pooran", photo: "/hero-players.png", role: "MIDDLE", batHand: "LHB", bowlType: "None", isOverseas: true, batRating: 93, bowlRating: 10, rating: 92, franchise: "LSG" },
  { id: "p9", name: "Rinku Singh", photo: "/advance stats title image.png", role: "FINISHER", batHand: "LHB", bowlType: "None", isOverseas: false, batRating: 91, bowlRating: 10, rating: 89, franchise: "KKR" },
  { id: "p10", name: "MS Dhoni", photo: "/msd.jpg", role: "FINISHER", batHand: "RHB", bowlType: "None", isOverseas: false, batRating: 88, bowlRating: 10, rating: 88, franchise: "CSK" },
  { id: "p11", name: "Andre Russell", photo: "/live feed image.png", role: "ALL_ROUNDER", batHand: "RHB", bowlType: "Pace", isOverseas: true, batRating: 94, bowlRating: 84, rating: 93, franchise: "KKR" },
  { id: "p12", name: "Ravindra Jadeja", photo: "/r jadeja.jpg", role: "ALL_ROUNDER", batHand: "LHB", bowlType: "Spin", isOverseas: false, batRating: 82, bowlRating: 89, rating: 88, franchise: "CSK" },
  { id: "p13", name: "Hardik Pandya", photo: "/advance stats title image.png", role: "ALL_ROUNDER", batHand: "RHB", bowlType: "Pace", isOverseas: false, batRating: 88, bowlRating: 85, rating: 88, franchise: "MI" },
  { id: "p14", name: "Sunil Narine", photo: "/s narine.jpg", role: "ALL_ROUNDER", batHand: "LHB", bowlType: "Spin", isOverseas: true, batRating: 88, bowlRating: 95, rating: 94, franchise: "KKR" },
  { id: "p15", name: "Jasprit Bumrah", photo: "/bumrah.jpg", role: "BOWLER", batHand: "RHB", bowlType: "Pace", isOverseas: false, batRating: 25, bowlRating: 99, rating: 98, franchise: "MI" },
  { id: "p16", name: "Rashid Khan", photo: "/rashid khan.jpg", role: "BOWLER", batHand: "RHB", bowlType: "Spin", isOverseas: true, batRating: 72, bowlRating: 96, rating: 95, franchise: "GT" },
  { id: "p17", name: "Mayank Yadav", photo: "/mayank yadav.jpg", role: "BOWLER", batHand: "RHB", bowlType: "Pace", isOverseas: false, batRating: 15, bowlRating: 90, rating: 88, franchise: "LSG" },
  { id: "p18", name: "Yuzvendra Chahal", photo: "/y chahal.jpg", role: "BOWLER", batHand: "RHB", bowlType: "Spin", isOverseas: false, batRating: 15, bowlRating: 91, rating: 89, franchise: "RR" },
  { id: "p19", name: "Matheesha Pathirana", photo: "/csk insight.jpg", role: "BOWLER", batHand: "RHB", bowlType: "Pace", isOverseas: true, batRating: 12, bowlRating: 93, rating: 91, franchise: "CSK" },
  { id: "p20", name: "Arshdeep Singh", photo: "/live feed image.png", role: "BOWLER", batHand: "LHB", bowlType: "Pace", isOverseas: false, batRating: 18, bowlRating: 90, rating: 88, franchise: "PBKS" }
];

// SECTION 8: STRATEGY SIGNAL WIRE
export interface StrategySignal {
  teamCode: string;
  teamName: string;
  signals: {
    type: "STRONG" | "WATCH" | "WEAKNESS";
    text: string;
  }[];
}

export const STRATEGY_SIGNALS: StrategySignal[] = [
  {
    teamCode: "MI",
    teamName: "Mumbai Indians",
    signals: [
      { type: "STRONG", text: "Pace depth ↑ (Domestic scouting ramp-up)" },
      { type: "STRONG", text: "Finishing fire ↑ (Late-order SR 215+)" },
      { type: "WATCH", text: "Spin depth → (Evaluating wrist-spin targets)" },
      { type: "WEAKNESS", text: "Middle-order stability ↓ (Against left-arm finger spin)" }
    ]
  },
  {
    teamCode: "CSK",
    teamName: "Chennai Super Kings",
    signals: [
      { type: "STRONG", text: "Spin containment ↑ (Chepauk par defense locked)" },
      { type: "WATCH", text: "Pace slinging transition → (Testing young speedsters)" },
      { type: "WEAKNESS", text: "Death wickets ↓ (Only 18% dismissals in overs 18-20)" },
      { type: "STRONG", text: "Bench depth ↑ (15 players with IPL cap experience)" }
    ]
  },
  {
    teamCode: "RCB",
    teamName: "Royal Challengers Bengaluru",
    signals: [
      { type: "STRONG", text: "Top-order boundary rate ↑ (PP SR 158.4)" },
      { type: "STRONG", text: "Pace attack overhaul ↑ (Signing yorker specialists)" },
      { type: "WATCH", text: "Wrist spin acquisition → (Purse reserved for marquee spinner)" },
      { type: "WEAKNESS", text: "Home venue vulnerability ↓ (Chinnaswamy ground boundary size)" }
    ]
  },
  {
    teamCode: "KKR",
    teamName: "Kolkata Knight Riders",
    signals: [
      { type: "STRONG", text: "Boundary rate obsession ↑ (68% runs in 4s & 6s)" },
      { type: "STRONG", text: "Mystery spin choke ↑ (Narine/Varun economy < 7.1)" },
      { type: "WATCH", text: "Domestic Indian pace pipeline → (Trialing 140k uncapped pacers)" },
      { type: "WEAKNESS", text: "Short-pitch vulnerability ↓ (Top order troubled by bouncers)" }
    ]
  }
];

// SECTION 9: CLASSIFIED INTELLIGENCE DROPS
export interface IntelligenceDrop {
  id: string;
  dropNumber: string;
  title: string;
  teamCode: string;
  dimension: "Strategy" | "Auction" | "Tactics" | "Economics";
  confidence: number;
  evidence: string;
  timestamp: string;
  summary: string;
  fullAnalysis: string;
  impactScore: string;
}

export const INTELLIGENCE_DROPS: IntelligenceDrop[] = [
  {
    id: "drop-041",
    dropNumber: "#041",
    title: "CSK's 2027 squad construction points toward a bowling-first strategy",
    teamCode: "CSK",
    dimension: "Strategy",
    confidence: 82,
    evidence: "Auction reserve allocation + squad composition + historical venue usage data",
    timestamp: "12m ago",
    summary: "With Chepauk pitch telemetry confirming higher boundary resistance, the management is prioritizing bowling economy over 220+ batting firepower.",
    fullAnalysis: "Internal tracking models suggest CSK's front office has recalibrated their expected match-winning threshold from 210 runs to 175 runs. Rather than chasing explosive top-order bats at inflated auction prices, the franchise is earmarking over 60% of their net purse for specialist sling-action pacers and left-arm orthodox spinners. This aligns with statistical findings indicating low-scoring defense yields higher tournament win equity (74.2% win rate when defending 170+ at Chepauk).",
    impactScore: "+8.4 Rating shift"
  },
  {
    id: "drop-042",
    dropNumber: "#042",
    title: "RCB front office shifting purse allocation to back-end death economy",
    teamCode: "RCB",
    dimension: "Auction",
    confidence: 88,
    evidence: "Purse ledger telemetry + bowler release notices + domestic scouting camps",
    timestamp: "28m ago",
    summary: "Fresh off their 2026 title, RCB analysts have concluded that retaining the trophy requires reducing Chinnaswamy death overs economy from 11.4 to 9.2.",
    fullAnalysis: "RCB's data group identified that while their batting unit generated a tournament-high 10.4 runs per over in 2026, their death bowling was the 8th worst in the league during pressure phases. The 2027 blueprint involves locking down two high-caliber Indian domestic seamers who bowl wide-line yorkers, freeing up an overseas slot for an explosive middle-order finisher.",
    impactScore: "+11.2 Death Bowling rating"
  },
  {
    id: "drop-043",
    dropNumber: "#043",
    title: "GT scouting pipeline targeting high-velocity domestic quicks for Motera pitch",
    teamCode: "GT",
    dimension: "Tactics",
    confidence: 79,
    evidence: "Domestic speed radar reports + coaching staff venue observations",
    timestamp: "1h ago",
    summary: "Ahmedabad's pitch relay has generated 1.8cm extra bounce, prompting Titans scouts to scout 145kmph+ tall release bowlers exclusively.",
    fullAnalysis: "Motera's red-soil square boundaries reward heavy-length pace bowlers who extract uncomfortable rib-cage bounce. Gujarat Titans are de-prioritizing medium-pace swing bowlers in favor of tall, high-release domestic speedsters capable of hitting 145kmph consistently on flat decks.",
    impactScore: "+9.0 Pace Index"
  },
  {
    id: "drop-044",
    dropNumber: "#044",
    title: "KKR tactical shift: Doubling down on boundary percentage over anchor preservation",
    teamCode: "KKR",
    dimension: "Strategy",
    confidence: 91,
    evidence: "Batting strike rate directives + academy simulation matches",
    timestamp: "2h ago",
    summary: "Mathematical models at Eden Gardens indicate playing out dot balls to preserve wickets yields negative expected value across all T20 conditions.",
    fullAnalysis: "KKR's analytics engine has instructed every batter from #1 through #8 to maintain an uninhibited boundary-hunting mindset. Statistical data demonstrates that teams aiming for 230 and getting bowled out for 195 still win 58% of games at Eden Gardens, whereas teams aiming for 180 and finishing 182/4 lose 72% of matches.",
    impactScore: "+14.5 Boundary Vol"
  }
];

// SECTION 10: THE NUMBERS BEHIND THE STRATEGY
export interface StrategyNumberCase {
  id: string;
  metricTitle: string;
  progression: {
    year: string;
    value: number;
    unit: string;
    note: string;
  }[];
  claim: string;
  dataFact: string;
  interpretation: string;
  strategyImplication: string;
}

export const STRATEGY_NUMBER_CASES: StrategyNumberCase[] = [
  {
    id: "death-rr",
    metricTitle: "Death Overs (16-20) League Average Run Rate",
    progression: [
      { year: "2024", value: 8.7, unit: "RR", note: "Baseline historical era" },
      { year: "2025", value: 9.4, unit: "RR", note: "Impact Player adoption" },
      { year: "2026", value: 10.2, unit: "RR", note: "Uninhibited boundary hunting" },
      { year: "2027 Target", value: 11.0, unit: "RR", note: "Projected league equilibrium" }
    ],
    claim: "Death overs bowling is no longer about economy; it is about boundary-denial and wickets.",
    dataFact: "Runs conceded in overs 16-20 surged by 26.4% from 2024 to 2026 across all 10 franchises.",
    interpretation: "Traditional yorkers on middle stump are now scooped or ramped with 82% boundary success. Bowlers must operate with wide yorkers, pace-off cutters, and steep short balls.",
    strategyImplication: "Franchises must allocate 25%+ of total auction purse to specialist death bowlers who possess multiple slower-ball variations and can execute within 15cm of the wide tramline."
  },
  {
    id: "powerplay-wickets",
    metricTitle: "Powerplay (1-6) Wickets Conceded vs Match Win %",
    progression: [
      { year: "0 Wkts Lost", value: 78.4, unit: "% Win", note: "Total control" },
      { year: "1 Wkt Lost", value: 61.2, unit: "% Win", note: "Above par" },
      { year: "2 Wkts Lost", value: 38.5, unit: "% Win", note: "Defensive pivot" },
      { year: "3+ Wkts Lost", value: 16.1, unit: "% Win", note: "Near-certain defeat" }
    ],
    claim: "Taking 2+ powerplay wickets delivers twice the win probability shift of an 18-run over.",
    dataFact: "Teams losing 2 or more wickets in the powerplay during 2026 won just 27 of 102 matches.",
    interpretation: "Defensive powerplay bowling has negative ROI. The reward for taking top-order wickets drastically outweighs conceding a boundary.",
    strategyImplication: "Teams are deploying frontline strike quicks and mystery spinners inside the first 6 overs regardless of match situation."
  }
];

// SECTION 11: ROAD TO 2027 STRATEGIC TIMELINE
export interface RoadmapStage {
  step: number;
  title: string;
  tag: string;
  status: "COMPLETED" | "ACTIVE" | "UPCOMING";
  date: string;
  description: string;
  classifiedIntel: string;
}

export const ROADMAP_STAGES: RoadmapStage[] = [
  {
    step: 1,
    title: "2026 SEASON AUDIT",
    tag: "Post-Mortem Telemetry",
    status: "COMPLETED",
    date: "June 2026",
    description: "Algorithmic audit of match turn-points, phase run rates, and clutch impact ratings across 74 matches.",
    classifiedIntel: "RCB diagnosed that their 2026 title was won on sheer top-order volume, masking underlying death-overs leakages that won't survive another cycle."
  },
  {
    step: 2,
    title: "IDENTIFY SQUAD DEFICITS",
    tag: "Deficit Isolation",
    status: "COMPLETED",
    date: "July - Aug 2026",
    description: "Statistical modeling isolates high-leverage weaknesses per franchise vs league standard.",
    classifiedIntel: "CSK identified a 25% target death wicket threshold; MI identified susceptibility to left-arm finger spin in overs 7-11."
  },
  {
    step: 3,
    title: "RETENTION ARCHITECTURE",
    tag: "Core Contract Locks",
    status: "ACTIVE",
    date: "Sept - Oct 2026",
    description: "RTM valuation and core player contract locks maximizing remaining purse efficiency.",
    classifiedIntel: "Franchises are prioritizing young domestic cores over aging marquee superstars to preserve auction purse leverage."
  },
  {
    step: 4,
    title: "AUCTION WAR ROOM",
    tag: "Bid Simulation Engine",
    status: "UPCOMING",
    date: "Dec 2026",
    description: "Dynamic bidding simulations targeting high-impact missing puzzle pieces within budget limits.",
    classifiedIntel: "Expect record bids on specialist Indian pace enforcers capable of clocking 145kmph+ with yorker precision."
  },
  {
    step: 5,
    title: "SQUAD ASSEMBLY",
    tag: "Depth Redundancy",
    status: "UPCOMING",
    date: "Jan 2027",
    description: "Secondary backup redundancy: 2-deep depth charts across all 11 tactical roles.",
    classifiedIntel: "Impact Player rules require franchises to roster specialized match-condition assets (e.g. dew specialists, slow-track chokers)."
  },
  {
    step: 6,
    title: "PLAYING XI CALIBRATION",
    tag: "Tactical Matrix",
    status: "UPCOMING",
    date: "Feb 2027",
    description: "Role lock and left/right balance optimization paired with venue match-up sheets.",
    classifiedIntel: "Automated simulation matches test batting depth down to #9 to enable unrestricted boundary hitting."
  },
  {
    step: 7,
    title: "TACTICAL SIMULATIONS",
    tag: "Pre-Season Trials",
    status: "UPCOMING",
    date: "Early Mar 2027",
    description: "Private intra-squad scenario trials (defending 45 off 18 balls, chasing 110 in 8 overs).",
    classifiedIntel: "Data-driven pressure testing to determine captaincy game-state trigger points."
  },
  {
    step: 8,
    title: "IPL 2027 LAUNCH",
    tag: "Championship Campaign",
    status: "UPCOMING",
    date: "Late Mar 2027",
    description: "Execution of the 2027 Strategic Blueprint across the 14-match regular season grind.",
    classifiedIntel: "The crowning of the team that best married boundary volume with surgical defensive execution."
  }
];

// SECTION 12: "WHAT IF?" DECISION-SUPPORT SYSTEM
export interface WhatIfScenario {
  id: string;
  title: string;
  teamCode: string;
  currentPlayoffProb: number;
  simulatedPlayoffProb: number;
  currentKeyMetric: { label: string; val: number };
  simulatedKeyMetric: { label: string; val: number };
  currentExpectedWins: number;
  simulatedExpectedWins: number;
  modelConclusion: string;
  recommendationRating: "STRONG_BUY" | "TACTICAL_BUY" | "AVOID";
}

export const WHAT_IF_SCENARIOS: WhatIfScenario[] = [
  {
    id: "wi-1",
    title: "WHAT IF CSK adds an elite death bowler?",
    teamCode: "CSK",
    currentPlayoffProb: 64,
    simulatedPlayoffProb: 71,
    currentKeyMetric: { label: "Death Bowling Rating", val: 68 },
    simulatedKeyMetric: { label: "Death Bowling Rating", val: 84 },
    currentExpectedWins: 8.1,
    simulatedExpectedWins: 9.3,
    modelConclusion: "Significant improvement in defending sub-180 totals (+1.2 expected wins). Death overs economy projected to drop from 11.2 to 8.9 RR. However, middle-order volatility against extreme pace remains an unaddressed risk.",
    recommendationRating: "STRONG_BUY"
  },
  {
    id: "wi-2",
    title: "WHAT IF RCB swaps anchor for 200+ SR opener?",
    teamCode: "RCB",
    currentPlayoffProb: 68,
    simulatedPlayoffProb: 74,
    currentKeyMetric: { label: "Powerplay Run Rate", val: 8.8 },
    simulatedKeyMetric: { label: "Powerplay Run Rate", val: 10.4 },
    currentExpectedWins: 8.4,
    simulatedExpectedWins: 9.5,
    modelConclusion: "Elevates Chinnaswamy first-innings par score to 215+. Win probability increases by +6%, though variance in chases rises by 12% if wickets fall in clusters.",
    recommendationRating: "TACTICAL_BUY"
  },
  {
    id: "wi-3",
    title: "WHAT IF MI retains 3 pace specialists & relies on domestic spin?",
    teamCode: "MI",
    currentPlayoffProb: 66,
    simulatedPlayoffProb: 69,
    currentKeyMetric: { label: "Pace Firepower Rating", val: 92 },
    simulatedKeyMetric: { label: "Pace Firepower Rating", val: 97 },
    currentExpectedWins: 8.2,
    simulatedExpectedWins: 8.9,
    modelConclusion: "Wankhede home dominance rises to 82% win rate. However, team suffers a -14% win penalty on sluggish away turners (Chepauk, Ekana) where spin choke is mandatory.",
    recommendationRating: "TACTICAL_BUY"
  }
];

// SECTION 13: PLAYERS WHO COULD CHANGE THE 2027 STORY (BREAKOUT INDEX)
export interface BreakoutPlayer {
  id: string;
  name: string;
  teamCode: string;
  role: string;
  age: number;
  breakoutProbability: number;
  photo?: string;
  factors: {
    name: string;
    score: number;
  }[];
  scoutingVerdict: string;
}

export const BREAKOUT_PLAYERS: BreakoutPlayer[] = [
  {
    id: "bp-1",
    name: "Mayank Yadav",
    teamCode: "LSG",
    role: "Right-Arm Express Fast Bowler",
    age: 23,
    breakoutProbability: 87,
    photo: "/mayank yadav.jpg",
    factors: [
      { name: "Velocity Ceiling", score: 98 },
      { name: "Recent Form", score: 86 },
      { name: "Opportunity Share", score: 92 },
      { name: "Role Expansion", score: 88 },
      { name: "Historical Efficiency", score: 84 }
    ],
    scoutingVerdict: "Consistent 150kmph+ speeds create unprecedented middle-overs wicket equity. If body conditioning holds, he is the single highest-ceiling pace disruptor in the 2027 cycle."
  },
  {
    id: "bp-2",
    name: "Abhishek Sharma",
    teamCode: "SRH",
    role: "Left-Hand Opening Destroyer / SLA Spin",
    age: 24,
    breakoutProbability: 81,
    photo: "/abhisek sharma.jpg",
    factors: [
      { name: "Boundary Intent", score: 96 },
      { name: "Recent Form", score: 91 },
      { name: "Opportunity Share", score: 89 },
      { name: "Role Expansion", score: 79 },
      { name: "Historical Efficiency", score: 82 }
    ],
    scoutingVerdict: "Operating with a 200+ powerplay strike rate against both seam and spin. Evolving into an all-format top-order alpha with added left-arm spin utility."
  },
  {
    id: "bp-3",
    name: "Matheesha Pathirana",
    teamCode: "CSK",
    role: "Right-Arm Sling Death Specialist",
    age: 23,
    breakoutProbability: 79,
    photo: "/csk insight.jpg",
    factors: [
      { name: "Release Deception", score: 95 },
      { name: "Recent Form", score: 84 },
      { name: "Opportunity Share", score: 90 },
      { name: "Role Expansion", score: 76 },
      { name: "Historical Efficiency", score: 87 }
    ],
    scoutingVerdict: "The Malinga-style release angle remains unreadable in death overs. Targeted to bowl 3 overs between 15-20 as CSK's primary defensive weapon."
  },
  {
    id: "bp-4",
    name: "Rinku Singh",
    teamCode: "KKR",
    role: "Left-Hand Finisher",
    age: 27,
    breakoutProbability: 76,
    factors: [
      { name: "Clutch Composure", score: 94 },
      { name: "Recent Form", score: 82 },
      { name: "Opportunity Share", score: 80 },
      { name: "Role Expansion", score: 85 },
      { name: "Historical Efficiency", score: 89 }
    ],
    scoutingVerdict: "Finishing efficiency in the final 12 balls exceeds 220 SR with sub-10% dot ball rate. Prime candidate for a promoted #5 role with greater over volume."
  }
];

// SECTION 14: VENUE X TEAM STRATEGY MATRIX
export interface VenueStrategyItem {
  venueId: string;
  venueName: string;
  city: string;
  parScore: number;
  expectedAdvantage: string;
  strategicInsight: string;
  teamFits: {
    teamCode: string;
    fitScore: number;
    fitNote: string;
  }[];
}

export const VENUE_STRATEGY_ITEMS: VenueStrategyItem[] = [
  {
    venueId: "chepauk",
    venueName: "MA Chidambaram Stadium (Chepauk)",
    city: "Chennai",
    parScore: 165,
    expectedAdvantage: "🟡 Spin Suffocation & Ball Grip",
    strategicInsight: "Chepauk surfaces reward sides that deploy 2+ frontline spin options and batters adept at strike rotation without taking aerial risks.",
    teamFits: [
      { teamCode: "CSK", fitScore: 94, fitNote: "Tailor-made for dual finger spin and low-scoring defense" },
      { teamCode: "KKR", fitScore: 88, fitNote: "Narine and Varun choke middle overs effortlessly" },
      { teamCode: "MI", fitScore: 71, fitNote: "Struggles when raw pace cannot extract bounce" }
    ]
  },
  {
    venueId: "chinnaswamy",
    venueName: "M. Chinnaswamy Stadium",
    city: "Bengaluru",
    parScore: 208,
    expectedAdvantage: "🔥 High-Altitude Boundary Explosion",
    strategicInsight: "Short 60m square boundaries and 900m altitude make sub-190 scores un-defendable. Victory hinges on wide-line death yorkers and uninterrupted boundary intent.",
    teamFits: [
      { teamCode: "RCB", fitScore: 92, fitNote: "Built to produce 210+ first-innings totals" },
      { teamCode: "SRH", fitScore: 90, fitNote: "Hyper-aggressive top order thrives in tiny stadiums" },
      { teamCode: "CSK", fitScore: 68, fitNote: "Spin choke neutralised by small dimensions" }
    ]
  },
  {
    venueId: "wankhede",
    venueName: "Wankhede Stadium",
    city: "Mumbai",
    parScore: 198,
    expectedAdvantage: "⚡ True Pace Bounce & 2nd Innings Dew",
    strategicInsight: "Red soil offers steep carry for genuine fast bowlers. Chasing teams possess a 64% win rate due to heavy sea-breeze dew dampening spinners in the 2nd innings.",
    teamFits: [
      { teamCode: "MI", fitScore: 95, fitNote: "Bumrah + power hitters excel in true bounce conditions" },
      { teamCode: "GT", fitScore: 82, fitNote: "Seam-heavy attack holds up well against dew" },
      { teamCode: "PBKS", fitScore: 72, fitNote: "Susceptible to high-pace bouncers on red soil" }
    ]
  },
  {
    venueId: "motera",
    venueName: "Narendra Modi Stadium",
    city: "Ahmedabad",
    parScore: 188,
    expectedAdvantage: "🛡️ Big Boundary Running & Express Bounce",
    strategicInsight: "80m boundary dimensions punish mis-timed aerial shots. Demands fast running between wickets and tall bowlers who hit hard lengths.",
    teamFits: [
      { teamCode: "GT", fitScore: 93, fitNote: "Disciplined boundary containment suited for big field" },
      { teamCode: "RR", fitScore: 85, fitNote: "Wrist spinners use big boundaries to induce mishits" },
      { teamCode: "LSG", fitScore: 75, fitNote: "Anchor-heavy batting struggles to clear 80m fence" }
    ]
  }
];

// SECTION 15: NEWSROOM FEED STREAM WITH 11 BADGES
export type FeedBadge = 
  | "STRATEGY" 
  | "FORECAST" 
  | "SIMULATION" 
  | "DATA DROP" 
  | "AUCTION" 
  | "TEAM DNA" 
  | "MATCHUP" 
  | "PLAYER WATCH" 
  | "VENUE" 
  | "VALUE" 
  | "ALERT";

export interface FeedItem {
  id: string;
  badge: FeedBadge;
  badgeColor: string;
  teamCode?: string;
  title: string;
  summary: string;
  statCallout?: string;
  statLabel?: string;
  source: string;
  timeAgo: string;
  isHot?: boolean;
}

export const FEED_ITEMS: FeedItem[] = [
  {
    id: "f-1",
    badge: "STRATEGY",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    teamCode: "CSK",
    title: "CSK's 2027 Squad Construction Points Toward Bowling-First Blueprint",
    summary: "Targeting specialist death slingers to address their 18% death-over wicket deficiency. Internal models show low-scoring defenses yield 74% win equity at Chepauk.",
    statCallout: "18% → 25%+",
    statLabel: "Target Death Wicket Rate",
    source: "Tactical Desk",
    timeAgo: "10m ago",
    isHot: true
  },
  {
    id: "f-2",
    badge: "AUCTION",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    teamCode: "PBKS",
    title: "Punjab Kings Enter 2027 Cycle with League-High ₹58.5 Cr Purse",
    summary: "Algorithmic modeling recommends deploying 60% of liquid budget on 3 elite capped Indian players rather than dispersing across domestic fringe squads.",
    statCallout: "₹58.5 Cr",
    statLabel: "Liquid Auction Purse",
    source: "Cap Economics Desk",
    timeAgo: "24m ago",
    isHot: true
  },
  {
    id: "f-3",
    badge: "TEAM DNA",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/40",
    teamCode: "RCB",
    title: "RCB DNA Shift: From Star Dependency to 3-Deep Death Bowling Redundancy",
    summary: "Post-2026 title audit revealed extreme top-order reliance. 2027 recruitment prioritizes domestic wide-line yorker executioners.",
    statCallout: "+18",
    statLabel: "Death Rating Target",
    source: "War Room Wire",
    timeAgo: "45m ago"
  },
  {
    id: "f-4",
    badge: "PLAYER WATCH",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    teamCode: "LSG",
    title: "Mayank Yadav Tops 2027 Breakout Index with 87% Probability",
    summary: "Consistent 150kmph+ speeds create unmatched middle-overs wicket equity. Analytics teams project him as the premier pace disruptor of the cycle.",
    statCallout: "87%",
    statLabel: "Breakout Probability",
    source: "Scout Intelligence",
    timeAgo: "1h ago"
  },
  {
    id: "f-5",
    badge: "DATA DROP",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    title: "Death Overs Run Rate Reaches 10.2 RR Equilibrium: Traditional Lines Dead",
    summary: "Analysis of 1,200 death overs shows conventional middle-stump yorkers are being dispatched for boundaries 82% of the time. Wide tramline execution is now mandatory.",
    statCallout: "10.2 RR",
    statLabel: "League Median (16-20)",
    source: "Telemetry Matrix",
    timeAgo: "1h 30m ago"
  },
  {
    id: "f-6",
    badge: "SIMULATION",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    teamCode: "CSK",
    title: "What-If Model: Adding Elite Death Bowler Elevates CSK Playoff Odds to 71%",
    summary: "Monte Carlo simulation across 10,000 season runs indicates +1.2 expected wins and reduces overs 18-20 conceded economy from 11.2 to 8.9 RR.",
    statCallout: "+6.2%",
    statLabel: "Playoff Probability Delta",
    source: "Decision Engine",
    timeAgo: "2h ago"
  },
  {
    id: "f-7",
    badge: "MATCHUP",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/40",
    teamCode: "RCB",
    title: "Tactical Battle: CSK vs RCB 2027 Showdown Favors RCB on High-Altitude Decks",
    summary: "While CSK holds a 94-67 advantage in spin control, RCB's 91-68 superiority in death execution provides winning margin at neutral venues.",
    statCallout: "Advantage: RCB",
    statLabel: "Model Verdict",
    source: "Tactical Desk",
    timeAgo: "3h ago"
  },
  {
    id: "f-8",
    badge: "VENUE",
    badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    title: "Chepauk vs Chinnaswamy: The 43-Run Par Score Schism in Squad Design",
    summary: "Franchises building for Chennai require 3 spinners and anchor stability; teams building for Bengaluru need 8 boundary-hitters and tramline seamers.",
    statCallout: "43 Runs",
    statLabel: "1st Innings Par Gap",
    source: "Venue Intelligence",
    timeAgo: "4h ago"
  },
  {
    id: "f-9",
    badge: "ALERT",
    badgeColor: "bg-red-500/30 text-red-200 border-red-500/60",
    teamCode: "MI",
    title: "Tactical Warning: MI Middle-Order Vulnerability Against Quality Wrist Spin",
    summary: "Strike rate drops from 158 vs pace to 131 vs turning deliveries in overs 7-11. Front office prioritizing dynamic left-hand middle order acquisition.",
    statCallout: "131.8 SR",
    statLabel: "Overs 7-11 vs Spin",
    source: "Telemetry Matrix",
    timeAgo: "5h ago"
  },
  {
    id: "f-10",
    badge: "FORECAST",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    teamCode: "SRH",
    title: "SRH 2027 Forecast: Projecting 5+ Team Totals Above 250 with Retained Core",
    summary: "Predictive modeling indicates retaining Head-Abhishek-Klaasen axis will preserve their 10.6 tournament-wide run rate regardless of opposition bowling.",
    statCallout: "250+ Runs",
    statLabel: "Projected 5x Barrier",
    source: "Predictive Desk",
    timeAgo: "6h ago"
  },
  {
    id: "f-11",
    badge: "VALUE",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    teamCode: "KKR",
    title: "ROI Analysis: Boundary-Only Batting Generates 22% Higher Win Equity per Crore",
    summary: "Cost-per-boundary modeling demonstrates acquiring aggressive 170+ SR hitters yields superior financial and competitive returns than traditional anchors.",
    statCallout: "+22% ROI",
    statLabel: "Per ₹ Cr Invested",
    source: "Cap Economics Desk",
    timeAgo: "7h ago"
  }
];
