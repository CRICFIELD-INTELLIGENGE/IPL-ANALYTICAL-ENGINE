import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

// GET /ipl/overview
router.get("/ipl/overview", (_req: Request, res: Response): void => {
  res.json({
    totalMatches: 1169,
    totalSeasons: 18,
    totalRuns: 374283,
    totalWickets: 13823,
    totalBalls: 278205,
    totalBoundaries: 46231,
    avgFirstInningsScore: 165,
    avgSecondInningsScore: 150,
    battingFirstWinPct: 43.2,
    chasingWinPct: 56.8,
    dotBallPct: 34.43,
    boundaryPct: 16.62,
    dateRange: "2008–2025",
    totalTeams: 19,
    totalVenues: 59,
    totalBatsmen: 703,
    totalBowlers: 550,
  });
});

// GET /ipl/seasons
router.get("/ipl/seasons", (_req: Request, res: Response): void => {
  res.json([
    { season: "2008", matches: 58, totalRuns: 17450, avgScore: 150.4, highestTeamScore: 212, champion: "Rajasthan Royals", sixes: 398, fours: 1621 },
    { season: "2009", matches: 57, totalRuns: 17120, avgScore: 150.2, highestTeamScore: 201, champion: "Deccan Chargers", sixes: 411, fours: 1589 },
    { season: "2010", matches: 60, totalRuns: 18240, avgScore: 152.0, highestTeamScore: 207, champion: "Chennai Super Kings", sixes: 453, fours: 1698 },
    { season: "2011", matches: 73, totalRuns: 22100, avgScore: 151.7, highestTeamScore: 204, champion: "Chennai Super Kings", sixes: 530, fours: 2034 },
    { season: "2012", matches: 76, totalRuns: 23450, avgScore: 154.9, highestTeamScore: 215, champion: "Kolkata Knight Riders", sixes: 601, fours: 2187 },
    { season: "2013", matches: 76, totalRuns: 23890, avgScore: 157.2, highestTeamScore: 222, champion: "Mumbai Indians", sixes: 634, fours: 2241 },
    { season: "2014", matches: 60, totalRuns: 19100, avgScore: 159.2, highestTeamScore: 231, champion: "Kolkata Knight Riders", sixes: 567, fours: 1789 },
    { season: "2015", matches: 59, totalRuns: 18760, avgScore: 159.0, highestTeamScore: 235, champion: "Mumbai Indians", sixes: 589, fours: 1756 },
    { season: "2016", matches: 60, totalRuns: 19340, avgScore: 161.2, highestTeamScore: 248, champion: "Sunrisers Hyderabad", sixes: 612, fours: 1823 },
    { season: "2017", matches: 59, totalRuns: 18980, avgScore: 160.8, highestTeamScore: 226, champion: "Mumbai Indians", sixes: 624, fours: 1791 },
    { season: "2018", matches: 60, totalRuns: 19680, avgScore: 164.0, highestTeamScore: 214, champion: "Chennai Super Kings", sixes: 661, fours: 1867 },
    { season: "2019", matches: 60, totalRuns: 19870, avgScore: 165.6, highestTeamScore: 239, champion: "Mumbai Indians", sixes: 703, fours: 1892 },
    { season: "2020", matches: 60, totalRuns: 20140, avgScore: 167.8, highestTeamScore: 228, champion: "Mumbai Indians", sixes: 724, fours: 1934 },
    { season: "2021", matches: 60, totalRuns: 20340, avgScore: 169.5, highestTeamScore: 221, champion: "Chennai Super Kings", sixes: 748, fours: 1945 },
    { season: "2022", matches: 74, totalRuns: 25780, avgScore: 174.2, highestTeamScore: 222, champion: "Gujarat Titans", sixes: 934, fours: 2456 },
    { season: "2023", matches: 74, totalRuns: 26120, avgScore: 176.5, highestTeamScore: 264, champion: "Chennai Super Kings", sixes: 978, fours: 2489 },
    { season: "2024", matches: 74, totalRuns: 26890, avgScore: 181.3, highestTeamScore: 287, champion: "Kolkata Knight Riders", sixes: 1023, fours: 2561 },
    { season: "2025", matches: 74, totalRuns: 27340, avgScore: 185.7, highestTeamScore: 293, champion: "Royal Challengers Bengaluru", sixes: 1089, fours: 2612 },
  ]);
});

// GET /ipl/toss-analysis
router.get("/ipl/toss-analysis", (_req: Request, res: Response): void => {
  res.json({
    batFirstWinPct: 43.2,
    fieldFirstWinPct: 56.8,
    tossBatDecisionPct: 38.5,
    tossFieldDecisionPct: 61.5,
    tossWinMatchWinPct: 51.8,
    venueBreakdown: [
      { venue: "Wankhede Stadium, Mumbai", batFirstWinPct: 37.6, fieldFirstWinPct: 62.4, matches: 101 },
      { venue: "M. Chinnaswamy Stadium, Bengaluru", batFirstWinPct: 40.2, fieldFirstWinPct: 59.8, matches: 92 },
      { venue: "Eden Gardens, Kolkata", batFirstWinPct: 42.5, fieldFirstWinPct: 57.5, matches: 87 },
      { venue: "MA Chidambaram Stadium, Chennai", batFirstWinPct: 46.8, fieldFirstWinPct: 53.2, matches: 79 },
      { venue: "Narendra Modi Stadium, Ahmedabad", batFirstWinPct: 44.4, fieldFirstWinPct: 55.6, matches: 63 },
      { venue: "Arun Jaitley Stadium, Delhi", batFirstWinPct: 41.0, fieldFirstWinPct: 59.0, matches: 71 },
      { venue: "Rajiv Gandhi Intl Cricket Stadium, Hyderabad", batFirstWinPct: 38.8, fieldFirstWinPct: 61.2, matches: 68 },
      { venue: "Punjab Cricket Association Stadium, Mohali", batFirstWinPct: 45.1, fieldFirstWinPct: 54.9, matches: 58 },
    ],
  });
});

// GET /ipl/phase-analysis
router.get("/ipl/phase-analysis", (_req: Request, res: Response): void => {
  res.json({
    powerplay: {
      label: "Powerplay (0-6)",
      avgRunRate: 8.12,
      avgWicketsPerMatch: 2.1,
      boundaryPct: 22.4,
      dotBallPct: 31.8,
    },
    middleOvers: {
      label: "Middle Overs (7-15)",
      avgRunRate: 7.84,
      avgWicketsPerMatch: 3.4,
      boundaryPct: 15.2,
      dotBallPct: 38.6,
    },
    deathOvers: {
      label: "Death Overs (16-20)",
      avgRunRate: 10.23,
      avgWicketsPerMatch: 3.8,
      boundaryPct: 21.1,
      dotBallPct: 25.3,
    },
  });
});

// GET /ipl/batsmen
router.get("/ipl/batsmen", (_req: Request, res: Response): void => {
  res.json([
    { name: "Virat Kohli", team: "Royal Challengers Bengaluru", matches: 243, innings: 237, runs: 8014, strikeRate: 131.2, average: 37.44, fours: 714, sixes: 264, fifties: 55, hundreds: 8, highScore: 113, dotBallPct: 28.4, boundaryPct: 31.2 },
    { name: "Rohit Sharma", team: "Mumbai Indians", matches: 243, innings: 237, runs: 6628, strikeRate: 131.1, average: 29.59, fours: 617, sixes: 262, fifties: 42, hundreds: 1, highScore: 109, dotBallPct: 30.1, boundaryPct: 29.8 },
    { name: "Shubman Gill", team: "Gujarat Titans", matches: 139, innings: 136, runs: 5044, strikeRate: 138.4, average: 41.68, fours: 492, sixes: 174, fifties: 35, hundreds: 5, highScore: 129, dotBallPct: 26.8, boundaryPct: 33.2 },
    { name: "David Warner", team: "Sunrisers Hyderabad", matches: 184, innings: 181, runs: 6565, strikeRate: 139.8, average: 41.66, fours: 671, sixes: 235, fifties: 59, hundreds: 4, highScore: 126, dotBallPct: 24.5, boundaryPct: 35.8 },
    { name: "MS Dhoni", team: "Chennai Super Kings", matches: 264, innings: 216, runs: 5243, strikeRate: 137.5, average: 40.02, fours: 363, sixes: 239, fifties: 24, hundreds: 0, highScore: 84, dotBallPct: 29.8, boundaryPct: 28.9 },
    { name: "AB de Villiers", team: "Royal Challengers Bengaluru", matches: 184, innings: 170, runs: 5162, strikeRate: 151.7, average: 39.70, fours: 412, sixes: 251, fifties: 40, hundreds: 3, highScore: 133, dotBallPct: 23.1, boundaryPct: 38.4 },
    { name: "Suresh Raina", team: "Chennai Super Kings", matches: 205, innings: 200, runs: 5528, strikeRate: 136.8, average: 32.51, fours: 525, sixes: 198, fifties: 39, hundreds: 1, highScore: 100, dotBallPct: 27.6, boundaryPct: 32.1 },
    { name: "KL Rahul", team: "Lucknow Super Giants", matches: 132, innings: 131, runs: 4683, strikeRate: 135.9, average: 47.80, fours: 427, sixes: 182, fifties: 41, hundreds: 4, highScore: 132, dotBallPct: 27.2, boundaryPct: 34.8 },
    { name: "Faf du Plessis", team: "Royal Challengers Bengaluru", matches: 163, innings: 158, runs: 4758, strikeRate: 133.4, average: 35.24, fours: 493, sixes: 162, fifties: 39, hundreds: 2, highScore: 96, dotBallPct: 27.0, boundaryPct: 33.4 },
    { name: "Jos Buttler", team: "Rajasthan Royals", matches: 107, innings: 104, runs: 3924, strikeRate: 149.8, average: 42.65, fours: 387, sixes: 182, fifties: 30, hundreds: 7, highScore: 124, dotBallPct: 22.4, boundaryPct: 37.2 },
    { name: "Rishabh Pant", team: "Delhi Capitals", matches: 111, innings: 107, runs: 3284, strikeRate: 148.2, average: 35.64, fours: 278, sixes: 162, fifties: 18, hundreds: 0, highScore: 128, dotBallPct: 24.6, boundaryPct: 36.7 },
    { name: "Hardik Pandya", team: "Mumbai Indians", matches: 140, innings: 125, runs: 2975, strikeRate: 148.5, average: 30.05, fours: 218, sixes: 187, fifties: 17, hundreds: 0, highScore: 91, dotBallPct: 27.9, boundaryPct: 34.5 },
    { name: "Shane Watson", team: "Chennai Super Kings", matches: 145, innings: 137, runs: 3874, strikeRate: 137.0, average: 29.77, fours: 402, sixes: 164, fifties: 21, hundreds: 4, highScore: 117, dotBallPct: 28.3, boundaryPct: 31.8 },
    { name: "Chris Gayle", team: "Royal Challengers Bengaluru", matches: 142, innings: 137, runs: 4965, strikeRate: 148.9, average: 40.04, fours: 476, sixes: 357, fifties: 36, hundreds: 6, highScore: 175, dotBallPct: 24.8, boundaryPct: 38.1 },
    { name: "Ambati Rayudu", team: "Chennai Super Kings", matches: 196, innings: 181, runs: 4350, strikeRate: 129.7, average: 28.99, fours: 405, sixes: 128, fifties: 30, hundreds: 0, highScore: 100, dotBallPct: 31.2, boundaryPct: 28.4 },
    { name: "Quinton de Kock", team: "Lucknow Super Giants", matches: 107, innings: 106, runs: 3366, strikeRate: 135.5, average: 32.72, fours: 348, sixes: 108, fifties: 27, hundreds: 1, highScore: 140, dotBallPct: 28.4, boundaryPct: 30.7 },
    { name: "Sanju Samson", team: "Rajasthan Royals", matches: 168, innings: 159, runs: 4608, strikeRate: 137.4, average: 33.88, fours: 438, sixes: 187, fifties: 31, hundreds: 5, highScore: 212, dotBallPct: 26.1, boundaryPct: 34.2 },
    { name: "Mayank Agarwal", team: "Punjab Kings", matches: 109, innings: 106, runs: 3157, strikeRate: 136.5, average: 32.54, fours: 311, sixes: 127, fifties: 24, hundreds: 2, highScore: 106, dotBallPct: 28.7, boundaryPct: 31.4 },
    { name: "Glenn Maxwell", team: "Royal Challengers Bengaluru", matches: 115, innings: 110, runs: 2771, strikeRate: 154.3, average: 27.98, fours: 245, sixes: 194, fifties: 15, hundreds: 1, highScore: 95, dotBallPct: 22.7, boundaryPct: 40.2 },
    { name: "Andre Russell", team: "Kolkata Knight Riders", matches: 107, innings: 99, runs: 2510, strikeRate: 178.8, average: 34.93, fours: 174, sixes: 242, fifties: 13, hundreds: 0, highScore: 88, dotBallPct: 18.9, boundaryPct: 44.6 },
  ]);
});

// GET /ipl/batsmen/impact
router.get("/ipl/batsmen/impact", (_req: Request, res: Response): void => {
  res.json([
    { name: "MS Dhoni", team: "Chennai Super Kings", impactScore: 82.6, clutchIndex: 91.4, deathOverSR: 181.2, powerplaySR: 102.3, winContribution: 68.4, role: "Finisher/WK" },
    { name: "Virat Kohli", team: "Royal Challengers Bengaluru", impactScore: 81.1, clutchIndex: 78.3, deathOverSR: 142.3, powerplaySR: 128.7, winContribution: 72.1, role: "Anchor/Opener" },
    { name: "Hardik Pandya", team: "Mumbai Indians", impactScore: 78.3, clutchIndex: 82.1, deathOverSR: 178.4, powerplaySR: 138.2, winContribution: 61.8, role: "All-rounder" },
    { name: "Andre Russell", team: "Kolkata Knight Riders", impactScore: 77.2, clutchIndex: 87.4, deathOverSR: 194.5, powerplaySR: 134.6, winContribution: 58.9, role: "Finisher" },
    { name: "Jasprit Bumrah", team: "Mumbai Indians", impactScore: 77.2, clutchIndex: 88.1, deathOverSR: 0, powerplaySR: 0, winContribution: 63.2, role: "Bowler" },
    { name: "AB de Villiers", team: "Royal Challengers Bengaluru", impactScore: 76.8, clutchIndex: 84.7, deathOverSR: 189.2, powerplaySR: 142.1, winContribution: 67.3, role: "Middle-order" },
    { name: "Rohit Sharma", team: "Mumbai Indians", impactScore: 75.4, clutchIndex: 74.8, deathOverSR: 153.4, powerplaySR: 136.2, winContribution: 69.8, role: "Opener" },
    { name: "David Warner", team: "Sunrisers Hyderabad", impactScore: 74.1, clutchIndex: 72.3, deathOverSR: 148.7, powerplaySR: 141.2, winContribution: 71.4, role: "Opener" },
    { name: "KL Rahul", team: "Lucknow Super Giants", impactScore: 73.8, clutchIndex: 70.1, deathOverSR: 162.3, powerplaySR: 131.4, winContribution: 65.7, role: "Keeper/Opener" },
    { name: "Jos Buttler", team: "Rajasthan Royals", impactScore: 72.9, clutchIndex: 75.6, deathOverSR: 171.8, powerplaySR: 152.4, winContribution: 66.2, role: "Opener" },
  ]);
});

// GET /ipl/batsmen/boundaries
router.get("/ipl/batsmen/boundaries", (_req: Request, res: Response): void => {
  res.json([
    { name: "Chris Gayle", team: "Royal Challengers Bengaluru", fours: 476, sixes: 357, totalBoundaries: 833, boundaryRuns: 4046, boundaryPct: 81.5 },
    { name: "Virat Kohli", team: "Royal Challengers Bengaluru", fours: 714, sixes: 264, totalBoundaries: 978, boundaryRuns: 4440, boundaryPct: 55.4 },
    { name: "Rohit Sharma", team: "Mumbai Indians", fours: 617, sixes: 262, totalBoundaries: 879, boundaryRuns: 4040, boundaryPct: 60.9 },
    { name: "David Warner", team: "Sunrisers Hyderabad", fours: 671, sixes: 235, totalBoundaries: 906, boundaryRuns: 4094, boundaryPct: 62.4 },
    { name: "MS Dhoni", team: "Chennai Super Kings", fours: 363, sixes: 239, totalBoundaries: 602, boundaryRuns: 2886, boundaryPct: 55.0 },
    { name: "Andre Russell", team: "Kolkata Knight Riders", fours: 174, sixes: 242, totalBoundaries: 416, boundaryRuns: 2148, boundaryPct: 85.6 },
    { name: "AB de Villiers", team: "Royal Challengers Bengaluru", fours: 412, sixes: 251, totalBoundaries: 663, boundaryRuns: 3154, boundaryPct: 61.1 },
    { name: "Suresh Raina", team: "Chennai Super Kings", fours: 525, sixes: 198, totalBoundaries: 723, boundaryRuns: 3288, boundaryPct: 59.5 },
    { name: "Shubman Gill", team: "Gujarat Titans", fours: 492, sixes: 174, totalBoundaries: 666, boundaryRuns: 3012, boundaryPct: 59.7 },
    { name: "KL Rahul", team: "Lucknow Super Giants", fours: 427, sixes: 182, totalBoundaries: 609, boundaryRuns: 2800, boundaryPct: 59.8 },
  ]);
});

// GET /ipl/bowlers
router.get("/ipl/bowlers", (_req: Request, res: Response): void => {
  res.json([
    { name: "Yuzvendra Chahal", team: "Rajasthan Royals", matches: 166, wickets: 205, economy: 7.59, average: 22.41, strikeRate: 17.7, dotBallPct: 41.2, powerplayWickets: 38, deathWickets: 12, bestFigures: "5/40" },
    { name: "Dwayne Bravo", team: "Chennai Super Kings", matches: 161, wickets: 183, economy: 8.43, average: 25.36, strikeRate: 18.0, dotBallPct: 36.7, powerplayWickets: 22, deathWickets: 89, bestFigures: "4/22" },
    { name: "Lasith Malinga", team: "Mumbai Indians", matches: 122, wickets: 170, economy: 7.14, average: 21.93, strikeRate: 18.4, dotBallPct: 40.8, powerplayWickets: 42, deathWickets: 78, bestFigures: "5/13" },
    { name: "Jasprit Bumrah", team: "Mumbai Indians", matches: 120, wickets: 160, economy: 6.97, average: 22.48, strikeRate: 19.3, dotBallPct: 44.3, powerplayWickets: 38, deathWickets: 72, bestFigures: "5/10" },
    { name: "Amit Mishra", team: "Delhi Capitals", matches: 154, wickets: 166, economy: 7.35, average: 24.07, strikeRate: 19.6, dotBallPct: 42.1, powerplayWickets: 14, deathWickets: 18, bestFigures: "5/17" },
    { name: "Harshal Patel", team: "Royal Challengers Bengaluru", matches: 111, wickets: 154, economy: 8.68, average: 24.28, strikeRate: 16.8, dotBallPct: 37.4, powerplayWickets: 12, deathWickets: 91, bestFigures: "5/27" },
    { name: "Sunil Narine", team: "Kolkata Knight Riders", matches: 178, wickets: 171, economy: 6.67, average: 22.87, strikeRate: 20.6, dotBallPct: 46.7, powerplayWickets: 48, deathWickets: 21, bestFigures: "5/19" },
    { name: "Ravichandran Ashwin", team: "Rajasthan Royals", matches: 184, wickets: 157, economy: 7.02, average: 26.64, strikeRate: 22.7, dotBallPct: 44.8, powerplayWickets: 42, deathWickets: 14, bestFigures: "4/11" },
    { name: "Kagiso Rabada", team: "Punjab Kings", matches: 78, wickets: 110, economy: 8.24, average: 22.30, strikeRate: 16.2, dotBallPct: 39.2, powerplayWickets: 38, deathWickets: 48, bestFigures: "4/21" },
    { name: "Rashid Khan", team: "Gujarat Titans", matches: 112, wickets: 148, economy: 6.39, average: 19.54, strikeRate: 18.3, dotBallPct: 48.1, powerplayWickets: 22, deathWickets: 28, bestFigures: "3/4" },
    { name: "Harbhajan Singh", team: "Chennai Super Kings", matches: 163, wickets: 150, economy: 7.07, average: 26.41, strikeRate: 22.4, dotBallPct: 43.9, powerplayWickets: 31, deathWickets: 16, bestFigures: "5/18" },
    { name: "Mohit Sharma", team: "Gujarat Titans", matches: 82, wickets: 98, economy: 8.61, average: 27.47, strikeRate: 19.1, dotBallPct: 36.8, powerplayWickets: 24, deathWickets: 42, bestFigures: "5/20" },
    { name: "Sandeep Sharma", team: "Punjab Kings", matches: 113, wickets: 110, economy: 7.84, average: 27.02, strikeRate: 20.6, dotBallPct: 40.3, powerplayWickets: 52, deathWickets: 22, bestFigures: "4/11" },
    { name: "Mohammed Shami", team: "Gujarat Titans", matches: 109, wickets: 139, economy: 8.23, average: 22.42, strikeRate: 16.3, dotBallPct: 39.7, powerplayWickets: 37, deathWickets: 68, bestFigures: "4/16" },
    { name: "Piyush Chawla", team: "Chennai Super Kings", matches: 175, wickets: 157, economy: 7.91, average: 28.44, strikeRate: 21.6, dotBallPct: 40.2, powerplayWickets: 11, deathWickets: 20, bestFigures: "4/17" },
  ]);
});

// GET /ipl/bowlers/death-specialists
router.get("/ipl/bowlers/death-specialists", (_req: Request, res: Response): void => {
  res.json([
    { name: "Jasprit Bumrah", team: "Mumbai Indians", matches: 120, wickets: 72, economy: 7.82, average: 18.4, strikeRate: 14.1, dotBallPct: 38.2, powerplayWickets: 38, deathWickets: 72, bestFigures: "5/10" },
    { name: "Dwayne Bravo", team: "Chennai Super Kings", matches: 161, wickets: 89, economy: 9.41, average: 22.1, strikeRate: 14.1, dotBallPct: 32.4, powerplayWickets: 22, deathWickets: 89, bestFigures: "4/22" },
    { name: "Lasith Malinga", team: "Mumbai Indians", matches: 122, wickets: 78, economy: 8.14, average: 20.2, strikeRate: 14.9, dotBallPct: 36.8, powerplayWickets: 42, deathWickets: 78, bestFigures: "5/13" },
    { name: "Harshal Patel", team: "Royal Challengers Bengaluru", matches: 111, wickets: 91, economy: 9.12, average: 20.8, strikeRate: 13.7, dotBallPct: 33.7, powerplayWickets: 12, deathWickets: 91, bestFigures: "5/27" },
    { name: "Kagiso Rabada", team: "Punjab Kings", matches: 78, wickets: 48, economy: 9.04, average: 21.4, strikeRate: 14.2, dotBallPct: 34.1, powerplayWickets: 38, deathWickets: 48, bestFigures: "4/21" },
    { name: "Mohammed Shami", team: "Gujarat Titans", matches: 109, wickets: 68, economy: 9.34, average: 19.8, strikeRate: 12.7, dotBallPct: 35.4, powerplayWickets: 37, deathWickets: 68, bestFigures: "4/16" },
  ]);
});

// GET /ipl/teams
router.get("/ipl/teams", (_req: Request, res: Response): void => {
  res.json([
    { name: "Chennai Super Kings", shortName: "CSK", matches: 246, wins: 147, losses: 96, winPct: 59.8, titles: 5, avgScore: 168.4, avgEconomy: 8.12, nrr: 0.326, color: "#F7C948" },
    { name: "Mumbai Indians", shortName: "MI", matches: 257, wins: 148, losses: 107, winPct: 57.9, titles: 5, avgScore: 169.1, avgEconomy: 8.08, nrr: 0.284, color: "#005DA0" },
    { name: "Kolkata Knight Riders", shortName: "KKR", matches: 239, wins: 131, losses: 105, winPct: 54.9, titles: 3, avgScore: 163.4, avgEconomy: 8.24, nrr: 0.127, color: "#3B225F" },
    { name: "Royal Challengers Bengaluru", shortName: "RCB", matches: 247, wins: 122, losses: 121, winPct: 50.0, titles: 1, avgScore: 171.2, avgEconomy: 8.74, nrr: 0.048, color: "#D11B22" },
    { name: "Sunrisers Hyderabad", shortName: "SRH", matches: 185, wins: 96, losses: 86, winPct: 52.7, titles: 1, avgScore: 162.3, avgEconomy: 7.82, nrr: 0.074, color: "#F26522" },
    { name: "Delhi Capitals", shortName: "DC", matches: 231, wins: 111, losses: 118, winPct: 48.5, titles: 0, avgScore: 162.7, avgEconomy: 8.31, nrr: -0.042, color: "#0078BC" },
    { name: "Rajasthan Royals", shortName: "RR", matches: 208, wins: 105, losses: 100, winPct: 51.2, titles: 2, avgScore: 166.8, avgEconomy: 8.37, nrr: 0.083, color: "#EA1A85" },
    { name: "Punjab Kings", shortName: "PBKS", matches: 236, wins: 110, losses: 124, winPct: 47.0, titles: 0, avgScore: 168.9, avgEconomy: 8.86, nrr: -0.113, color: "#DD1F2D" },
    { name: "Gujarat Titans", shortName: "GT", matches: 74, wins: 44, losses: 29, winPct: 60.3, titles: 1, avgScore: 170.4, avgEconomy: 8.18, nrr: 0.314, color: "#1C2B4A" },
    { name: "Lucknow Super Giants", shortName: "LSG", matches: 74, wins: 40, losses: 33, winPct: 54.8, titles: 0, avgScore: 165.2, avgEconomy: 8.34, nrr: 0.108, color: "#A0C1D1" },
  ]);
});

// GET /ipl/teams/head-to-head
router.get("/ipl/teams/head-to-head", (req: Request, res: Response): void => {
  const { team1, team2 } = req.query as { team1?: string; team2?: string };
  const records = [
    { team1: "CSK", team2: "MI", team1Wins: 21, team2Wins: 19, totalMatches: 40, noResult: 0 },
    { team1: "CSK", team2: "RCB", team1Wins: 24, team2Wins: 14, totalMatches: 38, noResult: 0 },
    { team1: "CSK", team2: "KKR", team1Wins: 22, team2Wins: 15, totalMatches: 37, noResult: 0 },
    { team1: "MI", team2: "RCB", team1Wins: 23, team2Wins: 14, totalMatches: 37, noResult: 0 },
    { team1: "MI", team2: "KKR", team1Wins: 21, team2Wins: 15, totalMatches: 36, noResult: 0 },
    { team1: "CSK", team2: "DC", team1Wins: 21, team2Wins: 12, totalMatches: 33, noResult: 0 },
    { team1: "RCB", team2: "KKR", team1Wins: 16, team2Wins: 19, totalMatches: 35, noResult: 0 },
    { team1: "CSK", team2: "RR", team1Wins: 18, team2Wins: 14, totalMatches: 32, noResult: 0 },
    { team1: "MI", team2: "DC", team1Wins: 20, team2Wins: 16, totalMatches: 36, noResult: 0 },
    { team1: "MI", team2: "RR", team1Wins: 18, team2Wins: 12, totalMatches: 30, noResult: 0 },
    { team1: "SRH", team2: "CSK", team1Wins: 12, team2Wins: 14, totalMatches: 26, noResult: 0 },
    { team1: "SRH", team2: "MI", team1Wins: 11, team2Wins: 14, totalMatches: 25, noResult: 0 },
  ];
  if (team1 && team2) {
    const filtered = records.filter(
      (r) =>
        (r.team1 === team1 && r.team2 === team2) ||
        (r.team1 === team2 && r.team2 === team1)
    );
    res.json(filtered);
  } else {
    res.json(records);
  }
});

// GET /ipl/teams/championship
router.get("/ipl/teams/championship", (_req: Request, res: Response): void => {
  res.json([
    { season: "2008", champion: "Rajasthan Royals", runnerUp: "Chennai Super Kings", finalScore: "164/7 vs 163/5", mvp: "Shane Watson", venue: "DY Patil Stadium" },
    { season: "2009", champion: "Deccan Chargers", runnerUp: "Royal Challengers Bengaluru", finalScore: "143/6 vs 137/9", mvp: "Adam Gilchrist", venue: "Wanderers Stadium" },
    { season: "2010", champion: "Chennai Super Kings", runnerUp: "Mumbai Indians", finalScore: "168/5 vs 165/6", mvp: "MS Dhoni", venue: "DY Patil Stadium" },
    { season: "2011", champion: "Chennai Super Kings", runnerUp: "Royal Challengers Bengaluru", finalScore: "205/5 vs 147/8", mvp: "Suresh Raina", venue: "MA Chidambaram Stadium" },
    { season: "2012", champion: "Kolkata Knight Riders", runnerUp: "Chennai Super Kings", finalScore: "192/5 vs 190/3", mvp: "Manvinder Bisla", venue: "MA Chidambaram Stadium" },
    { season: "2013", champion: "Mumbai Indians", runnerUp: "Chennai Super Kings", finalScore: "148/9 vs 125/9", mvp: "Rohit Sharma", venue: "Eden Gardens" },
    { season: "2014", champion: "Kolkata Knight Riders", runnerUp: "Punjab Kings", finalScore: "200/7 vs 199/4", mvp: "Manish Pandey", venue: "M Chinnaswamy Stadium" },
    { season: "2015", champion: "Mumbai Indians", runnerUp: "Chennai Super Kings", finalScore: "202/5 vs 161/8", mvp: "Rohit Sharma", venue: "Eden Gardens" },
    { season: "2016", champion: "Sunrisers Hyderabad", runnerUp: "Royal Challengers Bengaluru", finalScore: "208/7 vs 200/7", mvp: "Ben Cutting", venue: "M Chinnaswamy Stadium" },
    { season: "2017", champion: "Mumbai Indians", runnerUp: "Rising Pune Supergiant", finalScore: "129/8 vs 128/6", mvp: "Krunal Pandya", venue: "Rajiv Gandhi International Stadium" },
    { season: "2018", champion: "Chennai Super Kings", runnerUp: "Sunrisers Hyderabad", finalScore: "181/1 vs 178/6", mvp: "Shane Watson", venue: "Wankhede Stadium" },
    { season: "2019", champion: "Mumbai Indians", runnerUp: "Chennai Super Kings", finalScore: "149/8 vs 148/7", mvp: "Jasprit Bumrah", venue: "Rajiv Gandhi International Stadium" },
    { season: "2020", champion: "Mumbai Indians", runnerUp: "Delhi Capitals", finalScore: "157/7 vs 135/7", mvp: "Trent Boult", venue: "Dubai International Cricket Stadium" },
    { season: "2021", champion: "Chennai Super Kings", runnerUp: "Kolkata Knight Riders", finalScore: "192/3 vs 165/9", mvp: "Faf du Plessis", venue: "Dubai International Cricket Stadium" },
    { season: "2022", champion: "Gujarat Titans", runnerUp: "Rajasthan Royals", finalScore: "130/5 vs 129/9", mvp: "Hardik Pandya", venue: "Narendra Modi Stadium" },
    { season: "2023", champion: "Chennai Super Kings", runnerUp: "Gujarat Titans", finalScore: "171/5 vs 214/4 (DLS)", mvp: "Devon Conway", venue: "Narendra Modi Stadium" },
    { season: "2024", champion: "Kolkata Knight Riders", runnerUp: "Sunrisers Hyderabad", finalScore: "113/2 vs 113/10", mvp: "Venkatesh Iyer", venue: "MA Chidambaram Stadium" },
    { season: "2025", champion: "Royal Challengers Bengaluru", runnerUp: "Punjab Kings", finalScore: "219/4 vs 186/8", mvp: "Virat Kohli", venue: "Narendra Modi Stadium" },
  ]);
});

// GET /ipl/venues
router.get("/ipl/venues", (_req: Request, res: Response): void => {
  res.json([
    { name: "Wankhede Stadium", city: "Mumbai", matches: 101, avgFirstInnings: 171.2, avgSecondInnings: 157.4, battingFirstWinPct: 37.6, chasingWinPct: 62.4, avgBoundaries: 28.4, pitchType: "Batting" },
    { name: "M. Chinnaswamy Stadium", city: "Bengaluru", matches: 92, avgFirstInnings: 174.8, avgSecondInnings: 161.2, battingFirstWinPct: 40.2, chasingWinPct: 59.8, avgBoundaries: 31.2, pitchType: "Batting" },
    { name: "Eden Gardens", city: "Kolkata", matches: 87, avgFirstInnings: 163.8, avgSecondInnings: 151.4, battingFirstWinPct: 42.5, chasingWinPct: 57.5, avgBoundaries: 25.6, pitchType: "Balanced" },
    { name: "MA Chidambaram Stadium", city: "Chennai", matches: 79, avgFirstInnings: 158.4, avgSecondInnings: 144.1, battingFirstWinPct: 46.8, chasingWinPct: 53.2, avgBoundaries: 22.3, pitchType: "Spin-friendly" },
    { name: "Narendra Modi Stadium", city: "Ahmedabad", matches: 63, avgFirstInnings: 168.9, avgSecondInnings: 154.7, battingFirstWinPct: 44.4, chasingWinPct: 55.6, avgBoundaries: 27.1, pitchType: "Balanced" },
    { name: "Arun Jaitley Stadium", city: "Delhi", matches: 71, avgFirstInnings: 166.4, avgSecondInnings: 151.2, battingFirstWinPct: 41.0, chasingWinPct: 59.0, avgBoundaries: 26.8, pitchType: "Batting" },
    { name: "Rajiv Gandhi Intl Cricket Stadium", city: "Hyderabad", matches: 68, avgFirstInnings: 161.7, avgSecondInnings: 148.3, battingFirstWinPct: 38.8, chasingWinPct: 61.2, avgBoundaries: 24.4, pitchType: "Balanced" },
    { name: "Punjab Cricket Association Stadium", city: "Mohali", matches: 58, avgFirstInnings: 170.1, avgSecondInnings: 155.8, battingFirstWinPct: 45.1, chasingWinPct: 54.9, avgBoundaries: 28.7, pitchType: "Batting" },
  ]);
});

// GET /ipl/business/franchise-valuation
router.get("/ipl/business/franchise-valuation", (_req: Request, res: Response): void => {
  res.json([
    {
      team: "Mumbai Indians", shortName: "MI", color: "#005DA0", titles: 5,
      socialFollowers: "42M",
      cagr: 23.4,
      valuations: [
        { year: 2010, valuationCrore: 912 }, { year: 2012, valuationCrore: 1456 },
        { year: 2014, valuationCrore: 2134 }, { year: 2016, valuationCrore: 3234 },
        { year: 2018, valuationCrore: 4650 }, { year: 2020, valuationCrore: 6100 },
        { year: 2022, valuationCrore: 7890 }, { year: 2024, valuationCrore: 10200 },
      ],
    },
    {
      team: "Chennai Super Kings", shortName: "CSK", color: "#F7C948", titles: 5,
      socialFollowers: "38M",
      cagr: 22.8,
      valuations: [
        { year: 2010, valuationCrore: 876 }, { year: 2012, valuationCrore: 1378 },
        { year: 2014, valuationCrore: 2012 }, { year: 2016, valuationCrore: 3100 },
        { year: 2018, valuationCrore: 4420 }, { year: 2020, valuationCrore: 5800 },
        { year: 2022, valuationCrore: 7560 }, { year: 2024, valuationCrore: 9800 },
      ],
    },
    {
      team: "Royal Challengers Bengaluru", shortName: "RCB", color: "#D11B22", titles: 1,
      socialFollowers: "61M",
      cagr: 21.1,
      valuations: [
        { year: 2010, valuationCrore: 684 }, { year: 2012, valuationCrore: 1120 },
        { year: 2014, valuationCrore: 1734 }, { year: 2016, valuationCrore: 2890 },
        { year: 2018, valuationCrore: 4100 }, { year: 2020, valuationCrore: 5340 },
        { year: 2022, valuationCrore: 7120 }, { year: 2024, valuationCrore: 9100 },
      ],
    },
    {
      team: "Kolkata Knight Riders", shortName: "KKR", color: "#3B225F", titles: 3,
      socialFollowers: "33M",
      cagr: 20.6,
      valuations: [
        { year: 2010, valuationCrore: 722 }, { year: 2012, valuationCrore: 1124 },
        { year: 2014, valuationCrore: 1654 }, { year: 2016, valuationCrore: 2560 },
        { year: 2018, valuationCrore: 3640 }, { year: 2020, valuationCrore: 4890 },
        { year: 2022, valuationCrore: 6420 }, { year: 2024, valuationCrore: 8340 },
      ],
    },
    {
      team: "Delhi Capitals", shortName: "DC", color: "#0078BC", titles: 0,
      socialFollowers: "18M",
      cagr: 18.2,
      valuations: [
        { year: 2010, valuationCrore: 534 }, { year: 2012, valuationCrore: 820 },
        { year: 2014, valuationCrore: 1240 }, { year: 2016, valuationCrore: 1890 },
        { year: 2018, valuationCrore: 2710 }, { year: 2020, valuationCrore: 3620 },
        { year: 2022, valuationCrore: 4890 }, { year: 2024, valuationCrore: 6200 },
      ],
    },
  ]);
});

// GET /ipl/business/revenue
router.get("/ipl/business/revenue", (_req: Request, res: Response): void => {
  res.json({
    totalRevenue2024Crore: 16000,
    mediaRightsPct: 52.4,
    sponsorshipPct: 24.8,
    ticketingPct: 12.1,
    merchandisePct: 6.3,
    digitalPct: 4.4,
    revenueByYear: [
      { year: 2008, totalCrore: 420, mediaRights: 210, sponsorship: 130 },
      { year: 2010, totalCrore: 1430, mediaRights: 720, sponsorship: 440 },
      { year: 2012, totalCrore: 2680, mediaRights: 1340, sponsorship: 820 },
      { year: 2014, totalCrore: 3450, mediaRights: 1740, sponsorship: 1020 },
      { year: 2016, totalCrore: 5170, mediaRights: 2680, sponsorship: 1480 },
      { year: 2018, totalCrore: 7340, mediaRights: 3840, sponsorship: 2120 },
      { year: 2020, totalCrore: 9320, mediaRights: 4910, sponsorship: 2680 },
      { year: 2022, totalCrore: 11800, mediaRights: 6240, sponsorship: 3240 },
      { year: 2024, totalCrore: 16000, mediaRights: 8380, sponsorship: 3970 },
    ],
    topSponsors: [
      { brand: "Tata Group", category: "Title Sponsor", dealValueCrore: 2500 },
      { brand: "Dream11", category: "Fantasy Gaming", dealValueCrore: 1400 },
      { brand: "CRED", category: "Official Partner", dealValueCrore: 780 },
      { brand: "Swiggy Instamart", category: "Official Partner", dealValueCrore: 620 },
      { brand: "JioCinema", category: "Digital Streaming", dealValueCrore: 4500 },
      { brand: "Star Sports", category: "Broadcast", dealValueCrore: 3180 },
      { brand: "Pepsi", category: "Beverage Partner", dealValueCrore: 390 },
      { brand: "MRF Tyres", category: "Official Tyres", dealValueCrore: 280 },
    ],
  });
});

// GET /ipl/records
router.get("/ipl/records", (_req: Request, res: Response): void => {
  res.json({
    highestTeamScore: { value: "293/2", holder: "Royal Challengers Bengaluru", match: "vs Punjab Kings", season: "2025" },
    lowestTeamScore: { value: "49 all out", holder: "Rajasthan Royals", match: "vs Kolkata Knight Riders", season: "2008" },
    highestIndividualScore: { value: "175* (66)", holder: "Chris Gayle", match: "vs Pune Warriors", season: "2013" },
    bestBowlingFigures: { value: "6/14", holder: "Sohail Tanvir", match: "vs Chennai Super Kings", season: "2008" },
    mostRunsCareer: { value: "8,014 runs", holder: "Virat Kohli", match: "243 matches", season: "2008–2025" },
    mostWicketsCareer: { value: "205 wickets", holder: "Yuzvendra Chahal", match: "166 matches", season: "2011–2025" },
    fastestFifty: { value: "14 balls", holder: "KL Rahul", match: "vs Mumbai Indians", season: "2018" },
    fastestHundred: { value: "46 balls", holder: "AB de Villiers", match: "vs Gujarat Lions", season: "2016" },
    mostSixesSeason: { value: "33 sixes", holder: "Chris Gayle", match: "RCB - Season 2012", season: "2012" },
    mostFoursSeason: { value: "47 fours", holder: "David Warner", match: "SRH - Season 2016", season: "2016" },
  });
});

// GET /ipl/run-distribution
router.get("/ipl/run-distribution", (_req: Request, res: Response): void => {
  res.json([
    { range: "0-100", count: 4, pct: 0.17 },
    { range: "101-120", count: 28, pct: 1.20 },
    { range: "121-140", count: 84, pct: 3.60 },
    { range: "141-160", count: 218, pct: 9.35 },
    { range: "161-180", count: 387, pct: 16.59 },
    { range: "181-200", count: 492, pct: 21.11 },
    { range: "201-220", count: 378, pct: 16.21 },
    { range: "221-240", count: 234, pct: 10.04 },
    { range: "241-260", count: 142, pct: 6.09 },
    { range: "261-280", count: 78, pct: 3.35 },
    { range: "281+", count: 43, pct: 1.84 },
  ]);
});

// GET /ipl/dismissals
router.get("/ipl/dismissals", (_req: Request, res: Response): void => {
  res.json([
    { type: "Caught", count: 7834, pct: 56.7 },
    { type: "Bowled", count: 2341, pct: 16.9 },
    { type: "LBW", count: 1123, pct: 8.1 },
    { type: "Run Out", count: 1089, pct: 7.9 },
    { type: "Stumped", count: 934, pct: 6.8 },
    { type: "Hit Wicket", count: 312, pct: 2.3 },
    { type: "Other", count: 190, pct: 1.4 },
  ]);
});

export default router;
