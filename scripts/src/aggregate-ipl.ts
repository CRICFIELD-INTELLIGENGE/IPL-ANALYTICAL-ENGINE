/**
 * Aggregate Cricsheet IPL JSONs into compact JSON outputs that ship with the
 * frontend. Run via: pnpm --filter @workspace/scripts run aggregate-ipl
 *
 * Reads:  lib/cricket-data/raw/*.json
 * Writes: lib/cricket-data/aggregated/*.json
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..", "..");
const ROOT = join(REPO, "lib", "cricket-data");
const RAW = join(ROOT, "raw");
const OUT = join(ROOT, "aggregated");
const PUBLIC_OUT = join(REPO, "artifacts", "ipl-analytics", "public", "data");

if (!existsSync(RAW)) {
  console.error(`No raw data at ${RAW}. Download first: see scripts/README`);
  process.exit(1);
}
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
if (!existsSync(PUBLIC_OUT)) mkdirSync(PUBLIC_OUT, { recursive: true });

// ---------- Types ----------
interface Wicket {
  player_out: string;
  kind: string;
  fielders?: { name?: string }[];
}
interface Delivery {
  batter: string;
  bowler: string;
  non_striker: string;
  runs: { batter: number; extras: number; total: number };
  extras?: { wides?: number; noballs?: number; byes?: number; legbyes?: number };
  wickets?: Wicket[];
}
interface Over {
  over: number;
  deliveries: Delivery[];
}
interface Innings {
  team: string;
  overs: Over[];
}
interface MatchInfo {
  city?: string;
  dates: string[];
  event?: { name?: string; match_number?: number; stage?: string };
  match_type: string;
  outcome: {
    winner?: string;
    by?: { runs?: number; wickets?: number };
    result?: string;
    method?: string;
  };
  player_of_match?: string[];
  season: string | number;
  teams: string[];
  toss: { winner: string; decision: "bat" | "field" };
  venue: string;
}
interface Match {
  meta: { data_version: string; created: string; revision: number };
  info: MatchInfo;
  innings: Innings[];
}

// ---------- Helpers ----------
const seasonOf = (s: string | number): string => {
  // Cricsheet seasons: "2024" stays as-is. Split-year "YYYY/YY" → end year by IPL convention,
  // EXCEPT "2020/21" (IPL 2020 played Sept-Nov 2020 in UAE) which stays "2020" so it doesn't
  // collide with the separately-listed "2021" season (IPL 2021).
  const str = String(s);
  if (/^\d{4}$/.test(str)) return str;
  if (str === "2020/21") return "2020";
  const m = str.match(/^(\d{2})(\d{2})\/(\d{2})$/);
  if (m) return `${m[1]}${m[3]}`; // 2007/08 → 2008
  const fallback = str.match(/^(\d{4})/);
  return fallback ? fallback[1] : str;
};

const oversStr = (balls: number): string => `${Math.floor(balls / 6)}.${balls % 6}`;

const phaseOf = (overNum: number): "powerplay" | "middle" | "death" => {
  if (overNum < 6) return "powerplay";
  if (overNum < 15) return "middle";
  return "death";
};

const TEAM_ALIASES: Record<string, string> = {
  "Delhi Daredevils": "Delhi Capitals",
  "Kings XI Punjab": "Punjab Kings",
  "Rising Pune Supergiants": "Rising Pune Supergiant",
  "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
};
const normTeam = (t: string): string => TEAM_ALIASES[t] ?? t;

const TEAM_SHORT: Record<string, string> = {
  "Mumbai Indians": "MI",
  "Chennai Super Kings": "CSK",
  "Royal Challengers Bengaluru": "RCB",
  "Kolkata Knight Riders": "KKR",
  "Delhi Capitals": "DC",
  "Punjab Kings": "PBKS",
  "Rajasthan Royals": "RR",
  "Sunrisers Hyderabad": "SRH",
  "Gujarat Titans": "GT",
  "Lucknow Super Giants": "LSG",
  "Deccan Chargers": "DCh",
  "Pune Warriors": "PW",
  "Rising Pune Supergiant": "RPS",
  "Gujarat Lions": "GL",
  "Kochi Tuskers Kerala": "KTK",
};
const shortTeam = (team: string): string =>
  TEAM_SHORT[team] ?? team.split(" ").map((w) => w[0]).join("").slice(0, 4).toUpperCase();

const CURRENT_TEAM_CODES = new Set(["CSK", "MI", "RCB", "KKR", "DC", "PBKS", "RR", "SRH", "GT", "LSG"]);

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  return rows;
};

interface CurrentSquadRow {
  season: string;
  playerName: string;
  currentTeam: string;
}

const CURRENT_SQUAD_SEED: Record<string, string[]> = {
   CSK: ["MS Dhoni", "Ravindra Jadeja", "Ruturaj Gaikwad", "Devon Conway", "Deepak Hooda", "Rachin Ravindra", "Vijay Shankar", "Kamlesh Nagarkoti", "Vansh Bedi"],
   MI: ["Rohit Sharma", "Suryakumar Yadav", "Ishan Kishan", "Hardik Pandya", "Jasprit Bumrah", "Arshin Kulkarni", "Jonny Bairstow", "Mujeeb Rahman", "Naman Dhir"],
   RCB: ["Virat Kohli", "Rajat Patidar", "Glenn Maxwell", "Liam Livingstone", "Rahul Tripathi", "Manoj Bhandage", "Yash Dayal", "Mohammed Siraj"],
   KKR: ["Shreyas Iyer", "Sunil Narine", "Andre Russell", "Rinku Singh", "Varun Chakravarthy", "Harshit Rana", "Quinton De Kock", "Rahmanullah Gurbaz", "Spencer Johnson"],
   GT: ["Shubman Gill", "David Miller", "Rashid Khan", "Mohammed Shami", "Kane Williamson", "Sai Sudharsan", "Ravindra Jadeja", "Dasun Shanaka", "Mahipal Lomror"],
   RR: ["Sanju Samson", "Jos Buttler", "Yashasvi Jaiswal", "Riyan Parag", "Shimron Hetmyer", "Sandeep Sharma", "Wanindu Hasaranga", "Maheesh Theekshana"],
   PBKS: ["Shikhar Dhawan", "Liam Livingstone", "Sam Curran", "Harpreet Brar", "Arshdeep Singh", "Jitesh Sharma", "Prabhsimran Singh", "Harshal Patel", "Josh Inglis"],
   SRH: ["Pat Cummins", "Heinrich Klaasen", "Travis Head", "Abhishek Sharma", "Abhinav Manohar", "Bhuvneshwar Kumar", "T Natarajan", "Wiaan Mulder", "Atharva Taide"],
   DC: ["Rishabh Pant", "David Warner", "Mitchell Marsh", "Axar Patel", "Kuldeep Yadav", "Khaleel Ahmed", "Anrich Nortje", "Lalit Yadav", "Jake Fraser-McGurk"],
   LSG: ["KL Rahul", "Nicholas Pooran", "Marcus Stoinis", "Ravi Bishnoi", "Krunal Pandya", "Amit Mishra", "Ayush Badoni", "Rajvardhan Hangargekar", "David Miller"],
 };

const readCurrentSquads = (): CurrentSquadRow[] => {
  let season = "2026";
  const seen = new Set<string>();
  const squads: CurrentSquadRow[] = [];
  const addPlayer = (playerName: string, currentTeam: string): void => {
    const cleanName = playerName.replace(/\s+/g, " ").trim();
    const team = currentTeam.trim().toUpperCase();
    const key = `${season}:${team}:${cleanName.toLowerCase()}`;
    if (!cleanName || !CURRENT_TEAM_CODES.has(team) || seen.has(key)) return;
    seen.add(key);
    squads.push({ season, playerName: cleanName, currentTeam: team });
  };

  const csvFile = readdirSync(REPO).find((f) => {
    const name = f.toLowerCase();
    return name.includes("auction player list") && name.endsWith(".csv");
  });

  for (const [team, players] of Object.entries(CURRENT_SQUAD_SEED)) {
    for (const player of players) addPlayer(player, team);
  }

  if (!csvFile) {
    return squads.sort((a, b) => a.currentTeam.localeCompare(b.currentTeam) || a.playerName.localeCompare(b.playerName));
  }

  const rows = parseCsv(readFileSync(join(REPO, csvFile), "utf8"));
  const headers = rows[0] ?? [];
  const cleanHeaders = headers.map((h) => h.replace(/\s+/g, " ").trim().toLowerCase());
  const firstNameIdx = cleanHeaders.indexOf("first name");
  const surnameIdx = cleanHeaders.indexOf("surname");
  const teamIdx = cleanHeaders.findIndex((h) => /\b20\d{2}\s+team\b/.test(h));
  season = headers[teamIdx]?.match(/20\d{2}/)?.[0] ?? season;

  if (firstNameIdx < 0 || surnameIdx < 0 || teamIdx < 0) {
    return squads.sort((a, b) => a.currentTeam.localeCompare(b.currentTeam) || a.playerName.localeCompare(b.playerName));
  }

  for (const row of rows.slice(1)) {
    const firstName = row[firstNameIdx]?.trim() ?? "";
    const surname = row[surnameIdx]?.trim() ?? "";
    const playerName = `${firstName} ${surname}`.replace(/\s+/g, " ").trim();
    const currentTeam = (row[teamIdx]?.trim() ?? "").toUpperCase();
    addPlayer(playerName, currentTeam);
  }

  return squads.sort((a, b) => a.currentTeam.localeCompare(b.currentTeam) || a.playerName.localeCompare(b.playerName));
};

// ---------- Aggregators ----------
interface BatterAgg {
  player: string;
  team?: string;
  innings: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
  notOuts: number;
  highest: number;
  highestNotOut: boolean;
  ppRuns: number; ppBalls: number;
  middleRuns: number; middleBalls: number;
  deathRuns: number; deathBalls: number;
}
interface BowlerAgg {
  player: string;
  team?: string;
  innings: number;
  balls: number;
  runs: number;
  wickets: number;
  fourW: number;
  fiveW: number;
  bestWickets: number;
  bestRuns: number;
  ppRuns: number; ppBalls: number; ppWickets: number;
  middleRuns: number; middleBalls: number; middleWickets: number;
  deathRuns: number; deathBalls: number; deathWickets: number;
  dots: number;
  // --- New advanced pressure metrics ---
  /** Count of balls where batter scored exactly 4 or 6 (legal balls only) */
  boundaries: number;
  /** Set of unique match_ids this bowler bowled in — used for True Economy calc */
  matchIds: Set<string>;
}
interface TeamAgg {
  team: string;
  matches: number;
  wins: number;
  losses: number;
  noResult: number;
  totalRunsScored: number;
  totalRunsConceded: number;
  ballsFaced: number;
  ballsBowled: number;
  highest: number;
  lowest: number;
  titlesEstimate: number; // we'll compute via final winners
}
interface VenueAgg {
  venue: string;
  matches: number;
  firstInningsRunsSum: number;
  firstInningsCount: number;
  secondInningsRunsSum: number;
  secondInningsCount: number;
  battingFirstWins: number;
  chasingWins: number;
  tossWinChooseField: number;
  tossWinChooseBat: number;
  tossWinnerWins: number;
}
interface SeasonAgg {
  season: string;
  matches: number;
  runs: number;
  sixes: number;
  fours: number;
  wickets: number;
  highestTotal: number;
  highestChase: number;
}

const batters = new Map<string, BatterAgg>();
const bowlers = new Map<string, BowlerAgg>();
const teams = new Map<string, TeamAgg>();
const venues = new Map<string, VenueAgg>();
const seasons = new Map<string, SeasonAgg>();

/**
 * Per-match baseline economy: (total_runs_in_match / total_legal_balls) * 6
 * Built during the main pass so True Economy can reference it.
 * Key: matchId (string), Value: economy rate (runs per over)
 */
const matchBaselineEconomy = new Map<string, number>();
const matchSummaries: Array<{
  id: string; season: string; date: string; venue: string;
  team1: string; team2: string; winner?: string; margin?: string;
  team1Score?: string; team2Score?: string; mom?: string;
}> = [];
const teamBatters = new Map<string, BatterAgg>();
const teamBowlers = new Map<string, BowlerAgg>();

// Per-season top performers
const seasonBatters = new Map<string, Map<string, BatterAgg>>();
const seasonBowlers = new Map<string, Map<string, BowlerAgg>>();
const seasonTeamBatters = new Map<string, Map<string, BatterAgg>>();
const seasonTeamBowlers = new Map<string, Map<string, BowlerAgg>>();

const playerTeamKey = (player: string, team: string): string => `${shortTeam(team)}::${player}`;

const getBatter = (m: Map<string, BatterAgg>, key: string, player = key, team?: string): BatterAgg => {
  let b = m.get(key);
  if (!b) {
    b = { player, team, innings: 0, runs: 0, balls: 0, fours: 0, sixes: 0,
      fifties: 0, hundreds: 0, notOuts: 0, highest: 0, highestNotOut: false,
      ppRuns: 0, ppBalls: 0, middleRuns: 0, middleBalls: 0, deathRuns: 0, deathBalls: 0 };
    m.set(key, b);
  }
  return b;
};
const getBowler = (m: Map<string, BowlerAgg>, key: string, player = key, team?: string): BowlerAgg => {
  let b = m.get(key);
  if (!b) {
    b = { player, team, innings: 0, balls: 0, runs: 0, wickets: 0, fourW: 0, fiveW: 0,
      bestWickets: 0, bestRuns: 0,
      ppRuns: 0, ppBalls: 0, ppWickets: 0,
      middleRuns: 0, middleBalls: 0, middleWickets: 0,
      deathRuns: 0, deathBalls: 0, deathWickets: 0,
      dots: 0,
      boundaries: 0,
      matchIds: new Set<string>() };
    m.set(key, b);
  }
  return b;
};
const getTeam = (name: string): TeamAgg => {
  let t = teams.get(name);
  if (!t) {
    t = { team: name, matches: 0, wins: 0, losses: 0, noResult: 0,
      totalRunsScored: 0, totalRunsConceded: 0, ballsFaced: 0, ballsBowled: 0,
      highest: 0, lowest: 999, titlesEstimate: 0 };
    teams.set(name, t);
  }
  return t;
};
const getVenue = (v: string): VenueAgg => {
  let x = venues.get(v);
  if (!x) {
    x = { venue: v, matches: 0, firstInningsRunsSum: 0, firstInningsCount: 0,
      secondInningsRunsSum: 0, secondInningsCount: 0,
      battingFirstWins: 0, chasingWins: 0,
      tossWinChooseField: 0, tossWinChooseBat: 0, tossWinnerWins: 0 };
    venues.set(v, x);
  }
  return x;
};
const getSeason = (s: string): SeasonAgg => {
  let x = seasons.get(s);
  if (!x) {
    x = { season: s, matches: 0, runs: 0, sixes: 0, fours: 0, wickets: 0,
      highestTotal: 0, highestChase: 0 };
    seasons.set(s, x);
  }
  return x;
};

// ---------- Main pass ----------
const files = readdirSync(RAW).filter((f) => /^\d+\.json$/.test(f));
console.log(`Aggregating ${files.length} matches...`);

let processed = 0;
let skipped = 0;

for (const file of files) {
  const matchId = file.replace(/\.json$/, "");
  let raw: Match;
  try {
    raw = JSON.parse(readFileSync(join(RAW, file), "utf8")) as Match;
  } catch {
    skipped++;
    continue;
  }
  const info = raw.info;
  if (info.match_type !== "T20") { skipped++; continue; }
  const season = seasonOf(info.season);
  const teamsArr = info.teams.map(normTeam);
  const venue = info.venue;
  const date = info.dates[0];

  const seasonAgg = getSeason(season);
  seasonAgg.matches++;
  const venueAgg = getVenue(venue);
  venueAgg.matches++;

  // Toss
  const tossWinner = normTeam(info.toss.winner);
  if (info.toss.decision === "field") venueAgg.tossWinChooseField++;
  else venueAgg.tossWinChooseBat++;

  // Outcome
  const winner = info.outcome.winner ? normTeam(info.outcome.winner) : undefined;
  if (winner && winner === tossWinner) venueAgg.tossWinnerWins++;

  let margin = "";
  if (info.outcome.by?.runs) margin = `${info.outcome.by.runs} runs`;
  else if (info.outcome.by?.wickets) margin = `${info.outcome.by.wickets} wkts`;
  else if (info.outcome.result) margin = info.outcome.result;

  // Track team match counts
  for (const t of teamsArr) {
    const ta = getTeam(t);
    ta.matches++;
    if (winner === t) ta.wins++;
    else if (winner) ta.losses++;
    else ta.noResult++;
  }

  const inningsScores: { team: string; runs: number; wickets: number; balls: number }[] = [];
  const seasonBattersMap = seasonBatters.get(season) ?? (() => { const m = new Map<string, BatterAgg>(); seasonBatters.set(season, m); return m; })();
  const seasonBowlersMap = seasonBowlers.get(season) ?? (() => { const m = new Map<string, BowlerAgg>(); seasonBowlers.set(season, m); return m; })();
  const seasonTeamBattersMap = seasonTeamBatters.get(season) ?? (() => { const m = new Map<string, BatterAgg>(); seasonTeamBatters.set(season, m); return m; })();
  const seasonTeamBowlersMap = seasonTeamBowlers.get(season) ?? (() => { const m = new Map<string, BowlerAgg>(); seasonTeamBowlers.set(season, m); return m; })();

  // Innings walk
  raw.innings.forEach((inn, inningIdx) => {
    const battingTeam = normTeam(inn.team);
    const bowlingTeam = normTeam(teamsArr.find((t) => t !== battingTeam) ?? "");
    let runs = 0;
    let balls = 0;
    let wickets = 0;

    // Per-batter / per-bowler in this innings
    const matchBatters = new Map<string, BatterAgg>();
    const matchBowlers = new Map<string, BowlerAgg>();
    const dismissedBatters = new Set<string>();

    for (const over of inn.overs) {
      for (const d of over.deliveries) {
        const ext = d.extras ?? {};
        const isWide = !!ext.wides;
        const isNoball = !!ext.noballs;
        const legalBall = !isWide && !isNoball;
        const phase = phaseOf(over.over);

        runs += d.runs.total;

        // Batter
        const bGlobal = getBatter(batters, d.batter);
        const bSeason = getBatter(seasonBattersMap, d.batter);
        const bTeam = getBatter(teamBatters, playerTeamKey(d.batter, battingTeam), d.batter, battingTeam);
        const bSeasonTeam = getBatter(seasonTeamBattersMap, playerTeamKey(d.batter, battingTeam), d.batter, battingTeam);
        const bMatch = getBatter(matchBatters, d.batter);
        for (const b of [bGlobal, bSeason, bTeam, bSeasonTeam, bMatch]) {
          b.runs += d.runs.batter;
          if (legalBall) b.balls++;
          if (d.runs.batter === 4) b.fours++;
          if (d.runs.batter === 6) b.sixes++;
          if (legalBall) {
            if (phase === "powerplay") { b.ppRuns += d.runs.batter; b.ppBalls++; }
            else if (phase === "middle") { b.middleRuns += d.runs.batter; b.middleBalls++; }
            else { b.deathRuns += d.runs.batter; b.deathBalls++; }
          }
        }

        // Bowler
        const wGlobal = getBowler(bowlers, d.bowler);
        const wSeason = getBowler(seasonBowlersMap, d.bowler);
        const wTeam = getBowler(teamBowlers, playerTeamKey(d.bowler, bowlingTeam), d.bowler, bowlingTeam);
        const wSeasonTeam = getBowler(seasonTeamBowlersMap, playerTeamKey(d.bowler, bowlingTeam), d.bowler, bowlingTeam);
        const wMatch = getBowler(matchBowlers, d.bowler);
        for (const w of [wGlobal, wSeason, wTeam, wSeasonTeam, wMatch]) {
          // Runs conceded: batter runs + wides + no-balls only (byes/leg-byes NOT charged to bowler)
          const conceded = d.runs.batter + (ext.wides ?? 0) + (ext.noballs ?? 0);
          w.runs += conceded;
          if (legalBall) {
            w.balls++;
            // A legal delivery conceding zero total runs is a dot, including wicket balls.
            if (d.runs.total === 0) w.dots++;
            // Boundary tracking: batsman hit 4 or 6 (legal delivery only)
            if (d.runs.batter === 4 || d.runs.batter === 6) w.boundaries++;
          }
          // Phase breakdown (retained for any legacy consumers)
          if (legalBall) {
            if (phase === "powerplay") { w.ppRuns += conceded; w.ppBalls++; }
            else if (phase === "middle") { w.middleRuns += conceded; w.middleBalls++; }
            else { w.deathRuns += conceded; w.deathBalls++; }
          }
          // Track which match this bowler appeared in (for True Economy baseline lookup)
          w.matchIds.add(matchId);
        }

        // Wickets (count those credited to bowler — exclude run-outs/retired)
        if (d.wickets) {
          for (const wk of d.wickets) {
            const credited = !["run out", "retired hurt", "retired out", "obstructing the field"].includes(wk.kind);
            if (credited) {
              for (const w of [wGlobal, wSeason, wTeam, wSeasonTeam, wMatch]) {
                w.wickets++;
                if (legalBall) {
                  if (phase === "powerplay") w.ppWickets++;
                  else if (phase === "middle") w.middleWickets++;
                  else w.deathWickets++;
                }
              }
            }
            wickets++;
            dismissedBatters.add(wk.player_out);
          }
        }

        if (legalBall) balls++;
      }
    }

    // Mark each batter's "innings"; promote highest + fifties/hundreds + notOut
    for (const [name, mb] of matchBatters) {
      const bGlobal = getBatter(batters, name);
      const bSeason = getBatter(seasonBattersMap, name);
      const bTeam = getBatter(teamBatters, playerTeamKey(name, battingTeam), name, battingTeam);
      const bSeasonTeam = getBatter(seasonTeamBattersMap, playerTeamKey(name, battingTeam), name, battingTeam);
      for (const b of [bGlobal, bSeason, bTeam, bSeasonTeam]) {
        b.innings++;
        if (!dismissedBatters.has(name)) b.notOuts++;
        if (mb.runs > b.highest) b.highest = mb.runs;
        if (mb.runs >= 100) b.hundreds++;
        else if (mb.runs >= 50) b.fifties++;
      }
    }

    // Bowler innings count + best
    for (const [name, mb] of matchBowlers) {
      const wGlobal = getBowler(bowlers, name);
      const wSeason = getBowler(seasonBowlersMap, name);
      const wTeam = getBowler(teamBowlers, playerTeamKey(name, bowlingTeam), name, bowlingTeam);
      const wSeasonTeam = getBowler(seasonTeamBowlersMap, playerTeamKey(name, bowlingTeam), name, bowlingTeam);
      for (const w of [wGlobal, wSeason, wTeam, wSeasonTeam]) {
        w.innings++;
        if (mb.wickets >= 5) w.fiveW++;
        else if (mb.wickets >= 4) w.fourW++;
        // Best bowling: more wickets first, then fewer runs
        const better =
          mb.wickets > w.bestWickets ||
          (mb.wickets === w.bestWickets && mb.runs < w.bestRuns);
        if (better) { w.bestWickets = mb.wickets; w.bestRuns = mb.runs; }
      }
    }

    inningsScores.push({ team: battingTeam, runs, wickets, balls });

    // Team accumulators
    const battingAgg = getTeam(battingTeam);
    battingAgg.totalRunsScored += runs;
    battingAgg.ballsFaced += balls;
    if (runs > battingAgg.highest) battingAgg.highest = runs;
    if (runs < battingAgg.lowest && balls > 60) battingAgg.lowest = runs;

    const bowlingAgg = getTeam(bowlingTeam);
    bowlingAgg.totalRunsConceded += runs;
    bowlingAgg.ballsBowled += balls;

    // Season totals
    seasonAgg.runs += runs;
    seasonAgg.wickets += wickets;
    if (inningIdx === 0 && runs > seasonAgg.highestTotal) seasonAgg.highestTotal = runs;
    if (inningIdx === 1 && winner === battingTeam && runs > seasonAgg.highestChase) {
      seasonAgg.highestChase = runs;
    }

    // Venue innings sums
    if (inningIdx === 0) {
      venueAgg.firstInningsRunsSum += runs;
      venueAgg.firstInningsCount++;
    } else {
      venueAgg.secondInningsRunsSum += runs;
      venueAgg.secondInningsCount++;
    }
  });

  // ── Match-level baseline economy ────────────────────────────────────────────
  // Compute total legal balls + runs across ALL innings of this match to
  // derive a single "match tempo" baseline economy that contextualises how
  // scoring-friendly this specific game was (accounts for pitch, venue, era).
  {
    let matchTotalRuns = 0;
    let matchTotalLegalBalls = 0;
    for (const inn of raw.innings) {
      for (const over of inn.overs) {
        for (const d of over.deliveries) {
          const ext = d.extras ?? {};
          const isWide = !!ext.wides;
          const isNoball = !!ext.noballs;
          matchTotalRuns += d.runs.total;
          if (!isWide && !isNoball) matchTotalLegalBalls++;
        }
      }
    }
    // Baseline economy = (total runs / total legal balls) * 6
    // Guard against degenerate matches with 0 legal balls (abandoned, etc.)
    if (matchTotalLegalBalls > 0) {
      matchBaselineEconomy.set(matchId, (matchTotalRuns / matchTotalLegalBalls) * 6);
    }
  }

  // Sixes/fours season totals (re-derive from batter map for season for this match)
  // Cheaper: rescan deliveries — actually we already added per-delivery to bGlobal which inc fours/sixes, but season totals haven't.
  // Re-walk to count fours/sixes for season totals only:
  for (const inn of raw.innings) {
    for (const over of inn.overs) {
      for (const d of over.deliveries) {
        if (d.runs.batter === 4) seasonAgg.fours++;
        else if (d.runs.batter === 6) seasonAgg.sixes++;
      }
    }
  }

  // Win classification by venue (batting first vs chasing)
  if (winner && inningsScores.length === 2) {
    if (winner === inningsScores[0].team) venueAgg.battingFirstWins++;
    else if (winner === inningsScores[1].team) venueAgg.chasingWins++;
  }

  // Title estimate: if event stage == Final or match_number indicates final and winner present
  const stage = info.event?.stage?.toLowerCase() ?? "";
  if (stage.includes("final") && !stage.includes("semi") && !stage.includes("quali") && !stage.includes("elim") && winner) {
    getTeam(winner).titlesEstimate++;
  }

  matchSummaries.push({
    id: matchId,
    season,
    date,
    venue,
    team1: teamsArr[0],
    team2: teamsArr[1] ?? "",
    winner,
    margin,
    team1Score: inningsScores.find((i) => i.team === teamsArr[0])
      ? `${inningsScores.find((i) => i.team === teamsArr[0])!.runs}/${inningsScores.find((i) => i.team === teamsArr[0])!.wickets} (${oversStr(inningsScores.find((i) => i.team === teamsArr[0])!.balls)})`
      : undefined,
    team2Score: inningsScores.find((i) => i.team === teamsArr[1])
      ? `${inningsScores.find((i) => i.team === teamsArr[1])!.runs}/${inningsScores.find((i) => i.team === teamsArr[1])!.wickets} (${oversStr(inningsScores.find((i) => i.team === teamsArr[1])!.balls)})`
      : undefined,
    mom: info.player_of_match?.[0],
  });

  processed++;
  if (processed % 200 === 0) console.log(`  ...${processed} matches`);
}

console.log(`Processed ${processed} matches (skipped ${skipped})`);

// ---------- Derived metrics ----------
const round = (n: number, d = 2): number => {
  const m = Math.pow(10, d);
  return Math.round(n * m) / m;
};

const avg = (runs: number, innings: number, notOuts: number): number =>
  innings - notOuts > 0 ? round(runs / (innings - notOuts)) : round(runs, 2);
const sr = (runs: number, balls: number): number =>
  balls > 0 ? round((runs / balls) * 100, 2) : 0;
const eco = (runs: number, balls: number): number =>
  balls > 0 ? round((runs / balls) * 6, 2) : 0;
const bowlAvg = (runs: number, wkts: number): number =>
  wkts > 0 ? round(runs / wkts, 2) : 0;
const bowlSr = (balls: number, wkts: number): number =>
  wkts > 0 ? round(balls / wkts, 2) : 0;

const finalBatter = (b: BatterAgg) => ({
  player: b.player,
  innings: b.innings,
  runs: b.runs,
  balls: b.balls,
  avg: avg(b.runs, b.innings, b.notOuts),
  sr: sr(b.runs, b.balls),
  fours: b.fours,
  sixes: b.sixes,
  fifties: b.fifties,
  hundreds: b.hundreds,
  highest: b.highest,
  ppSr: sr(b.ppRuns, b.ppBalls),
  middleSr: sr(b.middleRuns, b.middleBalls),
  deathSr: sr(b.deathRuns, b.deathBalls),
  boundaryPct: b.balls > 0 ? round(((b.fours + b.sixes) / b.balls) * 100, 2) : 0,
});

const finalBowler = (w: BowlerAgg) => {
  const careerEcon = w.balls > 0 ? (w.runs / w.balls) * 6 : 0;

  // ── True Economy Rate ──────────────────────────────────────────────────────
  // For each match this bowler appeared in, look up the pre-computed
  // match-baseline economy (total_match_runs / total_legal_balls * 6).
  // Average those baselines → "the typical match tempo they bowl in".
  // True Economy = bowler career economy − that personal match-baseline avg.
  // Negative result = bowler is cheaper than the matches they play in (elite).
  let trueEconomy: number | null = null;
  if (w.matchIds.size > 0) {
    let baselineSum = 0;
    let baselineCount = 0;
    for (const mid of w.matchIds) {
      const bl = matchBaselineEconomy.get(mid);
      if (bl !== undefined) {
        baselineSum += bl;
        baselineCount++;
      }
    }
    if (baselineCount > 0) {
      const avgBaseline = baselineSum / baselineCount;
      trueEconomy = round(careerEcon - avgBaseline, 2);
    }
  }

  return {
    player: w.player,
    innings: w.innings,
    overs: oversStr(w.balls),
    balls: w.balls,
    runs: w.runs,
    wickets: w.wickets,
    econ: round(careerEcon, 2),
    avg: bowlAvg(w.runs, w.wickets),
    sr: bowlSr(w.balls, w.wickets),
    fourW: w.fourW,
    fiveW: w.fiveW,
    best: `${w.bestWickets}/${w.bestRuns}`,
    ppEcon: eco(w.ppRuns, w.ppBalls),
    middleEcon: eco(w.middleRuns, w.middleBalls),
    deathEcon: eco(w.deathRuns, w.deathBalls),
    ppWickets: w.ppWickets,
    middleWickets: w.middleWickets,
    deathWickets: w.deathWickets,
    dots: w.dots,
    // ── Standard pressure stat ──────────────────────────────────────────────
    /** DOT%: fraction of legal balls where no run was scored */
    dotPct: w.balls > 0 ? round((w.dots / w.balls) * 100, 1) : 0,
    // ── New advanced metrics ────────────────────────────────────────────────
    /** BND%: fraction of legal balls that went for a four or six */
    boundaryPct: w.balls > 0 ? round((w.boundaries / w.balls) * 100, 2) : 0,
    /**
     * BPB (Balls Per Boundary): how many legal balls a bowler typically
     * needs to bowl before conceding a boundary.
     * Zero-division guard: if no boundaries conceded, return total legal balls
     * (i.e., the bowler never conceded a boundary in their career — very rare).
     */
    ballsPerBoundary: w.boundaries > 0
      ? round(w.balls / w.boundaries, 1)
      : w.balls,
    /**
     * True Economy Rate: career economy minus the average match-baseline economy
     * across every match this bowler appeared in.
     * Negative = cheaper than match norm (elite); Positive = more expensive.
     * null when insufficient match data is available.
     */
    trueEconomy,
  };
};

const finalTeamBatter = (b: BatterAgg) => ({
  ...finalBatter(b),
  team: shortTeam(b.team ?? ""),
  teamName: b.team ?? "",
});

const finalTeamBowler = (w: BowlerAgg) => ({
  ...finalBowler(w),
  team: shortTeam(w.team ?? ""),
  teamName: w.team ?? "",
});

const finalTeam = (t: TeamAgg) => ({
  team: t.team,
  matches: t.matches,
  wins: t.wins,
  losses: t.losses,
  noResult: t.noResult,
  winPct: t.matches ? round((t.wins / t.matches) * 100, 1) : 0,
  runsScored: t.totalRunsScored,
  runsConceded: t.totalRunsConceded,
  battingSr: sr(t.totalRunsScored, t.ballsFaced),
  bowlingEcon: eco(t.totalRunsConceded, t.ballsBowled),
  highest: t.highest,
  lowest: t.lowest === 999 ? null : t.lowest,
  titles: t.titlesEstimate,
});

const finalVenue = (v: VenueAgg) => ({
  venue: v.venue,
  matches: v.matches,
  avg1stInn: v.firstInningsCount ? round(v.firstInningsRunsSum / v.firstInningsCount, 1) : 0,
  avg2ndInn: v.secondInningsCount ? round(v.secondInningsRunsSum / v.secondInningsCount, 1) : 0,
  battingFirstWinPct: v.matches ? round((v.battingFirstWins / v.matches) * 100, 1) : 0,
  chasingWinPct: v.matches ? round((v.chasingWins / v.matches) * 100, 1) : 0,
  tossDecisionFieldPct: v.matches ? round((v.tossWinChooseField / v.matches) * 100, 1) : 0,
  tossWinPct: v.matches ? round((v.tossWinnerWins / v.matches) * 100, 1) : 0,
});

// ---------- Outputs ----------
const battersAll = Array.from(batters.values()).map(finalBatter);
const bowlersAll = Array.from(bowlers.values()).map(finalBowler);
const teamBattersAll = Array.from(teamBatters.values()).map(finalTeamBatter);
const teamBowlersAll = Array.from(teamBowlers.values()).map(finalTeamBowler);
const teamsAll = Array.from(teams.values()).map(finalTeam).sort((a, b) => b.matches - a.matches);
const venuesAll = Array.from(venues.values()).map(finalVenue).sort((a, b) => b.matches - a.matches);
const seasonsAll = Array.from(seasons.values())
  .map((s) => ({ ...s, runs: s.runs, fours: s.fours, sixes: s.sixes }))
  .sort((a, b) => Number(a.season) - Number(b.season));
const seasonBattersAll = Array.from(seasonBatters.entries()).flatMap(([season, m]) =>
  Array.from(m.values()).map((b) => ({ ...finalBatter(b), season })),
);
const seasonBowlersAll = Array.from(seasonBowlers.entries()).flatMap(([season, m]) =>
  Array.from(m.values()).map((b) => ({ ...finalBowler(b), season })),
);
const seasonTeamBattersAll = Array.from(seasonTeamBatters.entries()).flatMap(([season, m]) =>
  Array.from(m.values()).map((b) => ({ ...finalTeamBatter(b), season })),
);
const seasonTeamBowlersAll = Array.from(seasonTeamBowlers.entries()).flatMap(([season, m]) =>
  Array.from(m.values()).map((b) => ({ ...finalTeamBowler(b), season })),
);
const currentSquads = readCurrentSquads();

// Top lists
const topRuns = [...battersAll].sort((a, b) => b.runs - a.runs).slice(0, 100);
const topSr = [...battersAll].filter((b) => b.balls >= 500).sort((a, b) => b.sr - a.sr).slice(0, 50);
const topAvg = [...battersAll].filter((b) => b.innings >= 30).sort((a, b) => b.avg - a.avg).slice(0, 50);
const topSixes = [...battersAll].sort((a, b) => b.sixes - a.sixes).slice(0, 50);
const topFours = [...battersAll].sort((a, b) => b.fours - a.fours).slice(0, 50);
const topHundreds = [...battersAll].filter((b) => b.hundreds > 0).sort((a, b) => b.hundreds - a.hundreds || b.runs - a.runs).slice(0, 50);

const topWickets = [...bowlersAll].sort((a, b) => b.wickets - a.wickets).slice(0, 100);
const topEcon = [...bowlersAll].filter((b) => b.balls >= 600).sort((a, b) => a.econ - b.econ).slice(0, 50);
const topBowlAvg = [...bowlersAll].filter((b) => b.wickets >= 30).sort((a, b) => a.avg - b.avg).slice(0, 50);
const topDeathBowlers = [...bowlersAll].filter((b) => b.balls >= 200).sort((a, b) => a.deathEcon - b.deathEcon).slice(0, 30);

// Per-season top-10s
const seasonTops: Record<string, { topBatters: ReturnType<typeof finalBatter>[]; topBowlers: ReturnType<typeof finalBowler>[] }> = {};
for (const [season, m] of seasonBatters) {
  const list = Array.from(m.values()).map(finalBatter).sort((a, b) => b.runs - a.runs).slice(0, 25);
  seasonTops[season] = { topBatters: list, topBowlers: [] };
}
for (const [season, m] of seasonBowlers) {
  const list = Array.from(m.values()).map(finalBowler).sort((a, b) => b.wickets - a.wickets).slice(0, 25);
  if (!seasonTops[season]) seasonTops[season] = { topBatters: [], topBowlers: [] };
  seasonTops[season].topBowlers = list;
}

// Run distribution buckets across all matches
const distBuckets: Record<string, number> = {
  "0-50": 0, "51-100": 0, "101-150": 0, "151-200": 0, "201+": 0,
};
for (const m of matchSummaries) {
  for (const s of [m.team1Score, m.team2Score]) {
    if (!s) continue;
    const r = parseInt(s);
    if (isNaN(r)) continue;
    if (r <= 50) distBuckets["0-50"]++;
    else if (r <= 100) distBuckets["51-100"]++;
    else if (r <= 150) distBuckets["101-150"]++;
    else if (r <= 200) distBuckets["151-200"]++;
    else distBuckets["201+"]++;
  }
}

// Overview
const overview = {
  totalMatches: matchSummaries.length,
  totalRuns: seasonsAll.reduce((s, x) => s + x.runs, 0),
  totalSixes: seasonsAll.reduce((s, x) => s + x.sixes, 0),
  totalFours: seasonsAll.reduce((s, x) => s + x.fours, 0),
  totalWickets: seasonsAll.reduce((s, x) => s + x.wickets, 0),
  seasons: seasonsAll.length,
  firstSeason: seasonsAll[0]?.season,
  lastSeason: seasonsAll[seasonsAll.length - 1]?.season,
  avg1stInnings: round(
    venuesAll.reduce((s, v) => s + v.avg1stInn * v.matches, 0) /
      Math.max(1, venuesAll.reduce((s, v) => s + v.matches, 0)),
    1,
  ),
};

// Sort matchSummaries newest first
matchSummaries.sort((a, b) => (a.date < b.date ? 1 : -1));

// Write outputs to BOTH the canonical lib dir and the frontend public/data dir
const writeJson = (name: string, data: unknown): void => {
  const json = JSON.stringify(data);
  writeFileSync(join(OUT, name), json);
  writeFileSync(join(PUBLIC_OUT, name), json);
  console.log(`  wrote ${name} (${(json.length / 1024).toFixed(1)}KB)`);
};

writeJson("overview.json", overview);
writeJson("seasons.json", seasonsAll);
writeJson("teams.json", teamsAll);
writeJson("venues.json", venuesAll);
writeJson("matches.json", matchSummaries);
writeJson("current-squads.json", currentSquads);
writeJson("player-career-stats.json", {
  batters: [...battersAll].sort((a, b) => b.runs - a.runs),
  bowlers: [...bowlersAll].sort((a, b) => b.wickets - a.wickets),
});
writeJson("player-team-stats.json", {
  batters: [...teamBattersAll].sort((a, b) => a.team.localeCompare(b.team) || b.runs - a.runs),
  bowlers: [...teamBowlersAll].sort((a, b) => a.team.localeCompare(b.team) || b.wickets - a.wickets),
});
writeJson("player-season-stats.json", {
  batters: [...seasonBattersAll].sort((a, b) => a.season.localeCompare(b.season) || b.runs - a.runs),
  bowlers: [...seasonBowlersAll].sort((a, b) => a.season.localeCompare(b.season) || b.wickets - a.wickets),
});
writeJson("player-team-season-stats.json", {
  batters: [...seasonTeamBattersAll].sort((a, b) => a.season.localeCompare(b.season) || a.team.localeCompare(b.team) || b.runs - a.runs),
  bowlers: [...seasonTeamBowlersAll].sort((a, b) => a.season.localeCompare(b.season) || a.team.localeCompare(b.team) || b.wickets - a.wickets),
});
writeJson("top-batters.json", { runs: topRuns, sr: topSr, avg: topAvg, sixes: topSixes, fours: topFours, hundreds: topHundreds });
writeJson("top-bowlers.json", { wickets: topWickets, econ: topEcon, avg: topBowlAvg, death: topDeathBowlers });
writeJson("season-tops.json", seasonTops);
writeJson("run-distribution.json", distBuckets);

console.log("\nDone.");
