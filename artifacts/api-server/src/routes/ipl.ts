import { Router } from "express";
import type { Request, Response } from "express";
import { getTeamAnalytics, getMatchupOpponents, getVenueAnalytics, NOT_SUPPORTED } from "../services/team-analytics.js";
import { getMatchScorecard, getMatchCommentary } from "../services/match-card.js";
import { getInsightFeed, resolveAndCount, getClickStats } from "../services/insights.js";
import { getNews } from "../services/news.js";
import { getContentHub, getBusinessArticles, type BusinessTag } from "../services/content-hub.js";
import {
  aggregateQueryStats,
  aggregateFieldStats,
  aggregateMatchupStats,
  aggregateScenarioStats,
  aggregateDrilldown,
  preLoadAllMatches,
  // Getter functions
  getOverview,
  getSeasons,
  getTossAnalysis,
  getPhaseAnalysis,
  getBatsmen,
  getBatsmenImpact,
  getBatsmenBoundaries,
  getBowlers,
  getBowlersDeath,
  getTeams,
  getChampionships,
  getVenues,
  getRecords,
  getRunDistribution,
  getDismissals,
  getTopBatters,
  getTopBowlers,
  getMatchesList,
  getCurrentSquads,
  getSquadsBySeason,
  getPlayerAuctions,
  getPointsTables,
  getCaptains,
  getPlayerCareerStats,
  getPlayerTeamStats,
  getPlayerSeasonStats,
  getPlayerTeamSeasonStats,
  getPlayerImages,
  getSeasonTops,
} from "../services/stats-aggregator";

// Pre-warm cache on first import
preLoadAllMatches();

const router = Router();

function getStatsQuery(req: Request): Record<string, string> {
  const q = { ...(req.query as Record<string, string>) };
  if (q.opposition && !q.opponent) q.opponent = q.opposition;

  const normalize = (val?: string) => {
    if (!val || typeof val !== "string") return "All";
    const clean = val.trim().toLowerCase();
    return clean === "" || clean.startsWith("all") ? "All" : val;
  };

  q.season = q.season && q.season !== "All Seasons" && q.season !== "All" ? q.season : "All";
  q.team = normalize(q.team);
  q.opponent = normalize(q.opponent);
  q.nationality = normalize(q.nationality);
  q.venue = normalize(q.venue);

  return q;
}

// ─────────────────────────────────────────────────────────────────────────────
//  OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

router.get("/ipl/overview", (_req: Request, res: Response): void => {
  getOverview()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

// ─────────────────────────────────────────────────────────────────────────────
//  SEASONS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/ipl/seasons", (_req: Request, res: Response): void => {
  getSeasons()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

// ─────────────────────────────────────────────────────────────────────────────
//  TOSS ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/ipl/toss-analysis", (_req: Request, res: Response): void => {
  getTossAnalysis()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

// ─────────────────────────────────────────────────────────────────────────────
//  PHASE ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/ipl/phase-analysis", (_req: Request, res: Response): void => {
  getPhaseAnalysis()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

// ─────────────────────────────────────────────────────────────────────────────
//  BATSMEN & BOWLERS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/ipl/batsmen", (_req: Request, res: Response): void => {
  getBatsmen()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/batsmen/impact", (_req: Request, res: Response): void => {
  getBatsmenImpact()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/batsmen/boundaries", (_req: Request, res: Response): void => {
  getBatsmenBoundaries()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/bowlers", (_req: Request, res: Response): void => {
  getBowlers()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/bowlers/death-specialists", (_req: Request, res: Response): void => {
  getBowlersDeath()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

// ─────────────────────────────────────────────────────────────────────────────
//  TEAMS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/ipl/teams", (_req: Request, res: Response): void => {
  getTeams()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/teams/head-to-head", (req: Request, res: Response): void => {
  const { team1, team2 } = req.query as { team1?: string; team2?: string };
  const records = [
    { team1: "CSK", team2: "MI",   team1Wins: 21, team2Wins: 19, totalMatches: 40, noResult: 0 },
    { team1: "CSK", team2: "RCB",  team1Wins: 24, team2Wins: 14, totalMatches: 38, noResult: 0 },
    { team1: "CSK", team2: "KKR",  team1Wins: 22, team2Wins: 15, totalMatches: 37, noResult: 0 },
    { team1: "MI",  team2: "RCB",  team1Wins: 23, team2Wins: 14, totalMatches: 37, noResult: 0 },
    { team1: "MI",  team2: "KKR",  team1Wins: 21, team2Wins: 15, totalMatches: 36, noResult: 0 },
    { team1: "CSK", team2: "DC",   team1Wins: 21, team2Wins: 12, totalMatches: 33, noResult: 0 },
    { team1: "RCB", team2: "KKR",  team1Wins: 16, team2Wins: 19, totalMatches: 35, noResult: 0 },
    { team1: "CSK", team2: "RR",   team1Wins: 18, team2Wins: 14, totalMatches: 32, noResult: 0 },
    { team1: "MI",  team2: "DC",   team1Wins: 20, team2Wins: 16, totalMatches: 36, noResult: 0 },
    { team1: "MI",  team2: "RR",   team1Wins: 18, team2Wins: 12, totalMatches: 30, noResult: 0 },
    { team1: "SRH", team2: "CSK",  team1Wins: 12, team2Wins: 14, totalMatches: 26, noResult: 0 },
    { team1: "SRH", team2: "MI",   team1Wins: 11, team2Wins: 14, totalMatches: 25, noResult: 0 },
  ];
  if (team1 && team2) {
    res.json(records.filter(r => (r.team1 === team1 && r.team2 === team2) || (r.team1 === team2 && r.team2 === team1)));
  } else {
    res.json(records);
  }
});

router.get("/ipl/teams/championship", (_req: Request, res: Response): void => {
  getChampionships()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

// ─────────────────────────────────────────────────────────────────────────────
//  VENUES
// ─────────────────────────────────────────────────────────────────────────────

router.get("/ipl/venues", (_req: Request, res: Response): void => {
  getVenues()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

// ─────────────────────────────────────────────────────────────────────────────
//  RECORDS & MISC
// ─────────────────────────────────────────────────────────────────────────────

router.get("/ipl/records", (_req: Request, res: Response): void => {
  getRecords()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/run-distribution", (_req: Request, res: Response): void => {
  getRunDistribution()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/dismissals", (_req: Request, res: Response): void => {
  getDismissals()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

// ─────────────────────────────────────────────────────────────────────────────
//  NEW REST ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/ipl/top-batters", (_req: Request, res: Response): void => {
  getTopBatters()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/top-bowlers", (_req: Request, res: Response): void => {
  getTopBowlers()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/matches", (_req: Request, res: Response): void => {
  getMatchesList()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/current-squads", (_req: Request, res: Response): void => {
  getCurrentSquads()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/squads-by-season", (_req: Request, res: Response): void => {
  getSquadsBySeason()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/player-auctions", (_req: Request, res: Response): void => {
  getPlayerAuctions()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/team-analytics", (req: Request, res: Response): void => {
  const team = String(req.query.team ?? "").trim();
  if (!team) {
    res.status(400).json({ error: "team is required" });
    return;
  }
  getTeamAnalytics({
    team,
    fromSeason: req.query.from ? String(req.query.from) : null,
    toSeason: req.query.to ? String(req.query.to) : null,
  })
    .then(data => {
      if (!data) {
        res.status(404).json({ error: `No analytics available for "${team}"` });
        return;
      }
      res.json({ ...data, notSupported: NOT_SUPPORTED });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/venue-analytics", (req: Request, res: Response): void => {
  const venue = String(req.query.venue ?? "").trim();
  if (!venue) {
    res.status(400).json({ error: "venue is required" });
    return;
  }
  const tod = req.query.timeOfDay;
  getVenueAnalytics({
    venue,
    fromSeason: req.query.from ? String(req.query.from) : null,
    toSeason: req.query.to ? String(req.query.to) : null,
    timeOfDay: tod === "evening" || tod === "afternoon" ? tod : "all",
  })
    .then(data => {
      if (!data) { res.status(404).json({ error: "No analytics for " + venue }); return; }
      res.json(data);
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/matchup-opponents", (req: Request, res: Response): void => {
  const player = String(req.query.player ?? "").trim();
  const role = req.query.role === "bowler" ? "bowler" : "batter";
  if (!player) {
    res.status(400).json({ error: "player is required" });
    return;
  }
  getMatchupOpponents(player, role)
    .then(data => res.json(data ?? []))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/captains", (_req: Request, res: Response): void => {
  getCaptains()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/points-tables", (_req: Request, res: Response): void => {
  getPointsTables()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/player-career-stats", (_req: Request, res: Response): void => {
  getPlayerCareerStats()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/player-team-stats", (_req: Request, res: Response): void => {
  getPlayerTeamStats()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/player-season-stats", (_req: Request, res: Response): void => {
  getPlayerSeasonStats()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/player-team-season-stats", (_req: Request, res: Response): void => {
  getPlayerTeamSeasonStats()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/player-images", (_req: Request, res: Response): void => {
  getPlayerImages()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/ipl/season-tops", (_req: Request, res: Response): void => {
  getSeasonTops()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

// ─────────────────────────────────────────────────────────────────────────────
//  DYNAMIC STATS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/** Main multidimensional query */
router.get("/ipl/stats/query", (req: Request, res: Response): void => {
  const q = req.query as Record<string, string>;
  aggregateQueryStats({
    season: q.season, team: q.team, opponent: q.opponent, venue: q.venue,
    phase: q.phase, overRange: q.overRange, bowlerType: q.bowlerType,
    deliveryType: q.deliveryType, pressure: q.pressure,
    representation: q.representation, nationality: q.nationality,
    fieldingPosition: q.fieldingPosition, innings: q.innings,
    matchContext: q.matchContext, homeAway: q.homeAway,
    chasingDefending: q.chasingDefending, battingHand: q.battingHand,
    batter: q.batter, bowler: q.bowler,
  })
    .then(stats => res.json(stats))
    .catch(err  => res.status(500).json({ error: err.message }));
});

/** Scoring areas (field positions) */
router.get("/ipl/stats/field-positions", (req: Request, res: Response): void => {
  const q = req.query as Record<string, string>;
  aggregateFieldStats({
    season: q.season, team: q.team, opponent: q.opponent, venue: q.venue,
    bowlerType: q.bowlerType, deliveryType: q.deliveryType,
    phase: q.phase, innings: q.innings, batter: q.batter,
  })
    .then(data => res.json(data))
    .catch(err  => res.status(500).json({ error: err.message }));
});

/** Batter vs Bowler matchup */
router.get("/ipl/stats/matchup", (req: Request, res: Response): void => {
  const q = req.query as Record<string, string>;
  if (!q.batter || !q.bowler) {
    res.status(400).json({ error: "batter and bowler query params are required" });
    return;
  }
  aggregateMatchupStats(q.batter, q.bowler, {
    season: q.season, team: q.team, opponent: q.opponent, venue: q.venue,
    phase: q.phase, innings: q.innings, matchContext: q.matchContext,
    representation: q.representation, nationality: q.nationality,
    fieldingPosition: q.fieldingPosition,
  })
    .then(data => res.json(data))
    .catch(err  => res.status(500).json({ error: err.message }));
});

/** Scenario analytics */
router.get("/ipl/stats/scenario", (req: Request, res: Response): void => {
  const q = req.query as Record<string, string>;
  aggregateScenarioStats({
    scenario: q.scenario, season: q.season, team: q.team, opponent: q.opponent,
    venue: q.venue, phase: q.phase, bowlerType: q.bowlerType,
    deliveryType: q.deliveryType, pressure: q.pressure, innings: q.innings,
    nationality: q.nationality, matchContext: q.matchContext,
    representation: q.representation, fieldingPosition: q.fieldingPosition,
    minBalls: q.minBalls ? parseInt(q.minBalls) : 10,
    minRuns:  q.minRuns  ? parseInt(q.minRuns)  : 0,
  })
    .then(data => res.json(data))
    .catch(err  => res.status(500).json({ error: err.message }));
});

/** Player dimensional drilldown */
router.get("/ipl/stats/drilldown", (req: Request, res: Response): void => {
  const q = req.query as Record<string, string>;
  if (!q.player) {
    res.status(400).json({ error: "player query param is required" });
    return;
  }
  const dimension = (q.dimension as any) || "phase";
  aggregateDrilldown(q.player, dimension, {
    season: q.season, team: q.team, opponent: q.opponent, venue: q.venue,
    phase: q.phase, overRange: q.overRange, bowlerType: q.bowlerType,
    deliveryType: q.deliveryType, pressure: q.pressure, innings: q.innings,
    matchContext: q.matchContext, representation: q.representation,
    nationality: q.nationality, fieldingPosition: q.fieldingPosition,
  })
    .then(data => res.json(data))
    .catch(err  => res.status(500).json({ error: err.message }));
});

// ─────────────────────────────────────────────────────────────────────────────
//  CONSOLIDATED ANALYTICS API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/stats/query", (req: Request, res: Response): void => {
  const q = getStatsQuery(req);

  const isDefault =
    (!q.season || q.season === "All" || q.season === "All Seasons") &&
    (!q.team || q.team === "All" || q.team === "All Teams") &&
    (!q.opponent || q.opponent === "All" || q.opponent === "All Opponents") &&
    (!q.venue || q.venue === "All" || q.venue === "All Venues") &&
    (!q.phase || q.phase === "All" || q.phase === "All Phases") &&
    (!q.bowlerType || q.bowlerType === "All" || q.bowlerType === "All Bowlers") &&
    (!q.pressure || q.pressure === "Standard" || q.pressure === "All") &&
    (!q.nationality || q.nationality === "all" || q.nationality === "All") &&
    (!q.fieldingPosition || q.fieldingPosition === "Scoring Area" || q.fieldingPosition === "All") &&
    (!q.innings || q.innings === "All" || q.innings === "All Innings") &&
    (!q.matchContext || q.matchContext === "All" || q.matchContext === "All Matches") &&
    (!q.representation || q.representation === "overall") &&
    !q.batter && !q.bowler && !q.battingHand && !q.deliveryType && !q.overRange && !q.homeAway && !q.chasingDefending;

  if (isDefault) {
    getPlayerCareerStats()
      .then(stats => res.json(stats))
      .catch(err => res.status(500).json({ error: err.message }));
    return;
  }

  // Debug: surface the effective query params used for aggregation
  req.log.info(
    {
      q,
      rawQuery: req.query,
    },
    "stats/query incoming",
  );

  aggregateQueryStats({
    season: q.season, team: q.team, opponent: q.opponent, venue: q.venue,
    phase: q.phase, overRange: q.overRange, bowlerType: q.bowlerType,
    deliveryType: q.deliveryType, pressure: q.pressure,
    representation: q.representation, nationality: q.nationality,
    fieldingPosition: q.fieldingPosition, innings: q.innings,
    matchContext: q.matchContext, homeAway: q.homeAway || q.home_away,
    chasingDefending: q.chasingDefending, battingHand: q.battingHand,
    batter: q.batter, bowler: q.bowler,
  })
    .then(stats => {
      const battersCount = Array.isArray((stats as any)?.batters) ? (stats as any).batters.length : 0;
      const bowlersCount = Array.isArray((stats as any)?.bowlers) ? (stats as any).bowlers.length : 0;
      req.log.info({ battersCount, bowlersCount }, "stats/query result counts");
      res.json(stats);
    })
    .catch(err  => {
      req.log.error({ err }, "stats/query failed");
      res.status(500).json({ error: err.message });
    });
});

router.get("/stats/drilldown", (req: Request, res: Response): void => {
  const q = getStatsQuery(req);
  if (!q.player && q.dimension !== "scoring-zone") {
    res.status(400).json({ error: "player query param is required" });
    return;
  }
  if (!q.player && q.dimension === "scoring-zone") {
    aggregateFieldStats({
      season: q.season, team: q.team, opponent: q.opponent, venue: q.venue,
      bowlerType: q.bowlerType, deliveryType: q.deliveryType,
      phase: q.phase, innings: q.innings, batter: q.batter,
    })
      .then(data => res.json(data))
      .catch(err  => res.status(500).json({ error: err.message }));
    return;
  }
  const dimension = (q.dimension as any) || "phase";
  aggregateDrilldown(q.player!, dimension, {
    season: q.season, team: q.team, opponent: q.opponent, venue: q.venue,
    phase: q.phase, overRange: q.overRange, bowlerType: q.bowlerType,
    deliveryType: q.deliveryType, pressure: q.pressure, innings: q.innings,
    matchContext: q.matchContext, representation: q.representation,
    nationality: q.nationality, fieldingPosition: q.fieldingPosition,
  })
    .then(data => res.json(data))
    .catch(err  => res.status(500).json({ error: err.message }));
});

router.get("/stats/matchup", (req: Request, res: Response): void => {
  const q = getStatsQuery(req);
  if (!q.batter || !q.bowler) {
    res.status(400).json({ error: "batter and bowler query params are required" });
    return;
  }
  aggregateMatchupStats(q.batter, q.bowler, {
    season: q.season, team: q.team, opponent: q.opponent, venue: q.venue,
    phase: q.phase, innings: q.innings, matchContext: q.matchContext,
    representation: q.representation, nationality: q.nationality,
    fieldingPosition: q.fieldingPosition,
  })
    .then(data => res.json(data))
    .catch(err  => res.status(500).json({ error: err.message }));
});

router.get("/stats/scenario", (req: Request, res: Response): void => {
  const q = getStatsQuery(req);
  aggregateScenarioStats({
    scenario: q.scenario, season: q.season, team: q.team, opponent: q.opponent,
    venue: q.venue, phase: q.phase, bowlerType: q.bowlerType,
    deliveryType: q.deliveryType, pressure: q.pressure, innings: q.innings,
    nationality: q.nationality, matchContext: q.matchContext,
    representation: q.representation, fieldingPosition: q.fieldingPosition,
    minBalls: q.minBalls ? parseInt(q.minBalls) : 10,
    minRuns:  q.minRuns  ? parseInt(q.minRuns)  : 0,
  })
    .then(data => res.json(data))
    .catch(err  => res.status(500).json({ error: err.message }));
});

router.get("/stats/player", (req: Request, res: Response): void => {
  const q = getStatsQuery(req);
  if (q.player) {
    const dimension = (q.dimension as any) || "phase";
    aggregateDrilldown(q.player, dimension, {
      season: q.season, team: q.team, opponent: q.opponent, venue: q.venue,
      phase: q.phase, overRange: q.overRange, bowlerType: q.bowlerType,
      deliveryType: q.deliveryType, pressure: q.pressure, innings: q.innings,
      matchContext: q.matchContext, representation: q.representation,
      nationality: q.nationality, fieldingPosition: q.fieldingPosition,
    })
      .then(data => res.json(data))
      .catch(err  => res.status(500).json({ error: err.message }));
    return;
  }
  getPlayerCareerStats()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/stats/team", (req: Request, res: Response): void => {
  const q = getStatsQuery(req);
  if (q.team && q.team !== "All Teams") {
    aggregateQueryStats({
      ...q, team: q.team, opponent: q.opponent, venue: q.venue,
      phase: q.phase, overRange: q.overRange, bowlerType: q.bowlerType,
      deliveryType: q.deliveryType, pressure: q.pressure,
      representation: q.representation, nationality: q.nationality,
      fieldingPosition: q.fieldingPosition, innings: q.innings,
      matchContext: q.matchContext, homeAway: q.homeAway || q.home_away,
      chasingDefending: q.chasingDefending,
    })
      .then(stats => res.json({ team: q.team, stats }))
      .catch(err => res.status(500).json({ error: err.message }));
    return;
  }
  getTeams()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/stats/venue", (req: Request, res: Response): void => {
  const q = getStatsQuery(req);
  if (q.venue && q.venue !== "All Venues" && q.venue !== "Venue") {
    aggregateQueryStats({
      ...q, venue: q.venue, team: q.team, opponent: q.opponent,
      phase: q.phase, overRange: q.overRange, bowlerType: q.bowlerType,
      deliveryType: q.deliveryType, pressure: q.pressure,
      representation: q.representation, nationality: q.nationality,
      fieldingPosition: q.fieldingPosition, innings: q.innings,
      matchContext: q.matchContext, homeAway: q.homeAway || q.home_away,
      chasingDefending: q.chasingDefending,
    })
      .then(stats => res.json({ venue: q.venue, stats }))
      .catch(err => res.status(500).json({ error: err.message }));
    return;
  }
  getVenues()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

// ─────────────────────────────────────────────────────────────────────────────
//  IPL ANALYTICS ENGINE DIRECT API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/players", (_req: Request, res: Response): void => {
  getPlayerCareerStats()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/teams", (_req: Request, res: Response): void => {
  getTeams()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/matches", (_req: Request, res: Response): void => {
  getMatchesList()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/matchups", (req: Request, res: Response): void => {
  const q = req.query as Record<string, string>;
  if (!q.batter || !q.bowler) {
    res.status(400).json({ error: "batter and bowler query params are required" });
    return;
  }
  aggregateMatchupStats(q.batter, q.bowler, {
    season: q.season, team: q.team, opponent: q.opponent, venue: q.venue,
    phase: q.phase, innings: q.innings, matchContext: q.matchContext,
  })
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/venues", (_req: Request, res: Response): void => {
  getVenues()
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/stat-builder", (req: Request, res: Response): void => {
  const q = req.query as Record<string, string>;
  aggregateQueryStats({
    season: q.season, team: q.team, opponent: q.opponent, venue: q.venue,
    phase: q.phase, overRange: q.overRange, bowlerType: q.bowlerType,
    deliveryType: q.deliveryType, pressure: q.pressure,
    representation: q.representation, nationality: q.nationality,
    fieldingPosition: q.fieldingPosition, innings: q.innings,
    matchContext: q.matchContext, homeAway: q.homeAway,
    chasingDefending: q.chasingDefending,
    batter: q.batter, bowler: q.bowler,
  })
    .then(stats => res.json(stats))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get("/scenario-intelligence", (req: Request, res: Response): void => {
  const q = req.query as Record<string, string>;
  aggregateScenarioStats({
    scenario: q.scenario, season: q.season, team: q.team, opponent: q.opponent,
    venue: q.venue, phase: q.phase, bowlerType: q.bowlerType,
    deliveryType: q.deliveryType, pressure: q.pressure, innings: q.innings,
    nationality: q.nationality, matchContext: q.matchContext,
    minBalls: q.minBalls ? parseInt(q.minBalls) : 10,
    minRuns:  q.minRuns  ? parseInt(q.minRuns)  : 0,
  })
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

/**
 * Full scorecard for any archived match, computed from the Cricsheet delivery
 * record. Replaces the placeholder card the match page used to synthesise.
 */
router.get("/ipl/match/:matchId/scorecard", (req: Request, res: Response): void => {
  try {
    const card = getMatchScorecard(String(req.params.matchId));
    if (!card) {
      res.status(404).json({ error: "no match data held for this id" });
      return;
    }
    res.json(card);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Ball-by-ball commentary, from the ESPN text joined ball-for-ball. */
router.get("/ipl/match/:matchId/commentary", (req: Request, res: Response): void => {
  try {
    res.json(getMatchCommentary(String(req.params.matchId)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Public insight feed: computed cards plus the registered article list. */
router.get("/ipl/insights", (_req: Request, res: Response): void => {
  try {
    res.json(getInsightFeed());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * The connecting loop. One stable internal link per article: this counts the
 * click and redirects to wherever the piece actually lives, so a post can move
 * between platforms without any link on the site changing.
 */
router.get("/ipl/insights/go/:slug", (req: Request, res: Response): void => {
  const url = resolveAndCount(String(req.params.slug));
  if (!url) {
    res.status(404).json({ error: "unknown article slug" });
    return;
  }
  res.redirect(302, url);
});

/** Click counts per article — the marketing read-out for the loop above. */
router.get("/ipl/insights/clicks", (_req: Request, res: Response): void => {
  try {
    res.json(getClickStats());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  CONTENT HUB — social posts, AI articles, business articles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full content hub payload: social posts (by platform), AI articles,
 * and business articles.
 */
router.get("/ipl/content/hub", (_req: Request, res: Response): void => {
  try {
    res.json(getContentHub());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Business articles, optionally filtered by tag query param:
 *   GET /api/ipl/content/business?tag=Media+Rights
 */
router.get("/ipl/content/business", (req: Request, res: Response): void => {
  try {
    const tag = req.query.tag as BusinessTag | undefined;
    res.json(getBusinessArticles(tag));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Live news wire. Per-feed status travels with the payload so a dead source is
 * visible rather than silently reducing the story count.
 */
router.get("/ipl/news", (req: Request, res: Response): void => {
  getNews(req.query.refresh === "1")
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

export default router;
