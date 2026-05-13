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

// ---------- Aggregators ----------
interface BatterAgg {
  player: string;
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
const matchSummaries: Array<{
  id: string; season: string; date: string; venue: string;
  team1: string; team2: string; winner?: string; margin?: string;
  team1Score?: string; team2Score?: string; mom?: string;
}> = [];

// Per-season top performers
const seasonBatters = new Map<string, Map<string, BatterAgg>>();
const seasonBowlers = new Map<string, Map<string, BowlerAgg>>();

const getBatter = (m: Map<string, BatterAgg>, name: string): BatterAgg => {
  let b = m.get(name);
  if (!b) {
    b = { player: name, innings: 0, runs: 0, balls: 0, fours: 0, sixes: 0,
      fifties: 0, hundreds: 0, notOuts: 0, highest: 0, highestNotOut: false,
      ppRuns: 0, ppBalls: 0, middleRuns: 0, middleBalls: 0, deathRuns: 0, deathBalls: 0 };
    m.set(name, b);
  }
  return b;
};
const getBowler = (m: Map<string, BowlerAgg>, name: string): BowlerAgg => {
  let b = m.get(name);
  if (!b) {
    b = { player: name, innings: 0, balls: 0, runs: 0, wickets: 0, fourW: 0, fiveW: 0,
      bestWickets: 0, bestRuns: 0,
      ppRuns: 0, ppBalls: 0, ppWickets: 0,
      middleRuns: 0, middleBalls: 0, middleWickets: 0,
      deathRuns: 0, deathBalls: 0, deathWickets: 0,
      dots: 0 };
    m.set(name, b);
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
        const bMatch = getBatter(matchBatters, d.batter);
        for (const b of [bGlobal, bSeason, bMatch]) {
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
        const wMatch = getBowler(matchBowlers, d.bowler);
        for (const w of [wGlobal, wSeason, wMatch]) {
          // Runs conceded: batter runs + wides + no-balls (not byes/legbyes)
          const conceded = d.runs.batter + (ext.wides ?? 0) + (ext.noballs ?? 0);
          w.runs += conceded;
          if (legalBall) w.balls++;
          if (legalBall && d.runs.total === 0 && !d.wickets) w.dots++;
          if (legalBall) {
            if (phase === "powerplay") { w.ppRuns += conceded; w.ppBalls++; }
            else if (phase === "middle") { w.middleRuns += conceded; w.middleBalls++; }
            else { w.deathRuns += conceded; w.deathBalls++; }
          }
        }

        // Wickets (count those credited to bowler — exclude run-outs/retired)
        if (d.wickets) {
          for (const wk of d.wickets) {
            const credited = !["run out", "retired hurt", "retired out", "obstructing the field"].includes(wk.kind);
            if (credited) {
              wGlobal.wickets++;
              wSeason.wickets++;
              wMatch.wickets++;
              if (legalBall) {
                if (phase === "powerplay") wGlobal.ppWickets++;
                else if (phase === "middle") wGlobal.middleWickets++;
                else wGlobal.deathWickets++;
              }
            }
            wickets++;
            // Track batter's dismissal
            const bg = getBatter(batters, wk.player_out);
            // not-out tracking handled at innings end
            void bg;
          }
        }

        if (legalBall) balls++;
      }
    }

    // Mark each batter's "innings"; promote highest + fifties/hundreds + notOut
    for (const [name, mb] of matchBatters) {
      const bGlobal = getBatter(batters, name);
      const bSeason = getBatter(seasonBattersMap, name);
      bGlobal.innings++;
      bSeason.innings++;
      if (mb.runs > bGlobal.highest) { bGlobal.highest = mb.runs; }
      if (mb.runs > bSeason.highest) { bSeason.highest = mb.runs; }
      if (mb.runs >= 100) { bGlobal.hundreds++; bSeason.hundreds++; }
      else if (mb.runs >= 50) { bGlobal.fifties++; bSeason.fifties++; }
    }

    // Bowler innings count + best
    for (const [name, mb] of matchBowlers) {
      const wGlobal = getBowler(bowlers, name);
      const wSeason = getBowler(seasonBowlersMap, name);
      wGlobal.innings++;
      wSeason.innings++;
      if (mb.wickets >= 5) { wGlobal.fiveW++; wSeason.fiveW++; }
      else if (mb.wickets >= 4) { wGlobal.fourW++; wSeason.fourW++; }
      // Best bowling: more wickets first, then fewer runs
      const better =
        mb.wickets > wGlobal.bestWickets ||
        (mb.wickets === wGlobal.bestWickets && mb.runs < wGlobal.bestRuns);
      if (better) { wGlobal.bestWickets = mb.wickets; wGlobal.bestRuns = mb.runs; }
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

const finalBowler = (w: BowlerAgg) => ({
  player: w.player,
  innings: w.innings,
  overs: oversStr(w.balls),
  balls: w.balls,
  runs: w.runs,
  wickets: w.wickets,
  econ: eco(w.runs, w.balls),
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
  dotPct: w.balls > 0 ? round((w.dots / w.balls) * 100, 1) : 0,
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
const teamsAll = Array.from(teams.values()).map(finalTeam).sort((a, b) => b.matches - a.matches);
const venuesAll = Array.from(venues.values()).map(finalVenue).sort((a, b) => b.matches - a.matches);
const seasonsAll = Array.from(seasons.values())
  .map((s) => ({ ...s, runs: s.runs, fours: s.fours, sixes: s.sixes }))
  .sort((a, b) => Number(a.season) - Number(b.season));

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
writeJson("top-batters.json", { runs: topRuns, sr: topSr, avg: topAvg, sixes: topSixes, fours: topFours, hundreds: topHundreds });
writeJson("top-bowlers.json", { wickets: topWickets, econ: topEcon, avg: topBowlAvg, death: topDeathBowlers });
writeJson("season-tops.json", seasonTops);
writeJson("run-distribution.json", distBuckets);

console.log("\nDone.");
