import {
  sqliteTable,
  integer,
  text,
  real,
  numeric,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// DIMENSION TABLES
// ============================================================================

export const teamsTable = sqliteTable("teams", {
  teamId: integer("team_id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
  shortName: text("short_name").notNull(),
  color: text("color").notNull(),
  titles: integer("titles").default(0).notNull(),
});

export const playersTable = sqliteTable("players", {
  playerId: integer("player_id").primaryKey({ autoIncrement: true }),
  cricsheetId: text("cricsheet_id").unique(), // canonical Cricsheet registry UUID, e.g. "ba607b88"
  name: text("name").notNull(),
  role: text("role"),
  country: text("country"),
  battingStyle: text("batting_style"),
  bowlingStyle: text("bowling_style"),
  imageUrl: text("image_url"),
  form: integer("form"),
  clutch: integer("clutch"),
  versatility: integer("versatility"),
  expectedValue: numeric("expected_value"), // in Crores
  rarity: text("rarity").default("Standard").notNull(),
  status: text("status").default("POOL").notNull(), // POOL, SOLD, UNSOLD, ACTIVE
});

export const venuesTable = sqliteTable("venues", {
  venueId: integer("venue_id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
  city: text("city"),
  pitchType: text("pitch_type").default("Balanced").notNull(),
});

export const seasonsTable = sqliteTable("seasons", {
  seasonId: text("season_id").primaryKey(), // e.g. '2008', '2026'
  championTeamId: integer("champion_team_id").references(() => teamsTable.teamId),
  runnerUpTeamId: integer("runner_up_team_id").references(() => teamsTable.teamId),
  mvpPlayerId: integer("mvp_player_id").references(() => playersTable.playerId),
});

// ============================================================================
// FACT TABLES
// ============================================================================

export const matchesTable = sqliteTable("matches", {
  matchId: text("match_id").primaryKey(),
  seasonId: text("season_id").references(() => seasonsTable.seasonId),
  date: text("date"),
  venueId: integer("venue_id").references(() => venuesTable.venueId),
  team1Id: integer("team1_id").references(() => teamsTable.teamId),
  team2Id: integer("team2_id").references(() => teamsTable.teamId),
  tossWinnerId: integer("toss_winner_id").references(() => teamsTable.teamId),
  tossDecision: text("toss_decision"), // 'bat' | 'field'
  winnerId: integer("winner_id").references(() => teamsTable.teamId),
  marginType: text("margin_type"), // 'runs', 'wickets', 'tie', 'no result'
  marginValue: integer("margin_value"),
  matchType: text("match_type"), // 'League', 'Qualifier', 'Eliminator', 'Final'
  playerOfMatchId: integer("player_of_match_id").references(() => playersTable.playerId),
  status: text("status").default("Finished").notNull(), // Finished, In Progress, Upcoming
});

export const inningsTable = sqliteTable("innings", {
  inningsId: integer("innings_id").primaryKey({ autoIncrement: true }),
  matchId: text("match_id").references(() => matchesTable.matchId, { onDelete: "cascade" }),
  inningsNumber: integer("innings_number").notNull(),
  battingTeamId: integer("batting_team_id").references(() => teamsTable.teamId),
  bowlingTeamId: integer("bowling_team_id").references(() => teamsTable.teamId),
  runs: integer("runs").default(0).notNull(),
  wickets: integer("wickets").default(0).notNull(),
  overs: real("overs").default(0.0).notNull(),
  totalLegalBalls: integer("total_legal_balls").default(0).notNull(),
  runRate: real("run_rate").default(0.0).notNull(),
  isCompleted: integer("is_completed", { mode: "boolean" }).default(false).notNull(),
  extrasTotal: integer("extras_total").default(0).notNull(),
}, (t) => [
  unique("unique_innings_per_match").on(t.matchId, t.inningsNumber)
]);

export const deliveriesTable = sqliteTable("deliveries", {
  deliveryId: integer("delivery_id").primaryKey({ autoIncrement: true }),
  matchId: text("match_id").references(() => matchesTable.matchId, { onDelete: "cascade" }),
  inningsId: integer("innings_id").references(() => inningsTable.inningsId, { onDelete: "cascade" }),
  overNum: integer("over_num").notNull(),
  ballNum: integer("ball_num").notNull(),
  batterId: integer("batter_id").references(() => playersTable.playerId),
  bowlerId: integer("bowler_id").references(() => playersTable.playerId),
  nonStrikerId: integer("non_striker_id").references(() => playersTable.playerId),
  batterRuns: integer("batter_runs").default(0).notNull(),
  extraRuns: integer("extra_runs").default(0).notNull(),
  totalRuns: integer("total_runs").default(0).notNull(),
  isWide: integer("is_wide", { mode: "boolean" }).default(false).notNull(),
  isNoball: integer("is_noball", { mode: "boolean" }).default(false).notNull(),
  isBye: integer("is_bye", { mode: "boolean" }).default(false).notNull(),
  isLegbye: integer("is_legbye", { mode: "boolean" }).default(false).notNull(),
  isPenalty: integer("is_penalty", { mode: "boolean" }).default(false).notNull(),
  isBoundary: integer("is_boundary", { mode: "boolean" }).default(false).notNull(), // batterRuns = 4 or 6
  deliveryType: text("delivery_type"),
  scoringArea: text("scoring_area"),
  pressureState: text("pressure_state").default("Standard").notNull(), // Standard, High, Clutch, Playoff
  // Derived columns
  phase: text("phase"),
  isDotBall: integer("is_dot_ball", { mode: "boolean" }).default(false).notNull(),
  isDeathOver: integer("is_death_over", { mode: "boolean" }).default(false).notNull(),
  isPowerplay: integer("is_powerplay", { mode: "boolean" }).default(false).notNull(),
  currentRr: real("current_rr").default(0.0).notNull(),
  requiredRr: real("required_rr").default(0.0).notNull(),
  wicketsLeft: integer("wickets_left").default(10).notNull(),
  wicketSeq: integer("wicket_seq"),
  wicketsRemaining: integer("wickets_remaining"),
  requiredRunRate: real("required_run_rate"),
});

export const dismissalsTable = sqliteTable("dismissals", {
  dismissalId: integer("dismissal_id").primaryKey({ autoIncrement: true }),
  deliveryId: integer("delivery_id").references(() => deliveriesTable.deliveryId, { onDelete: "cascade" }),
  playerOutId: integer("player_out_id").references(() => playersTable.playerId),
  kind: text("kind").notNull(),
  fielderId: integer("fielder_id").references(() => playersTable.playerId),
}, (t) => [
  index("dismissals_player_out_idx").on(t.playerOutId)
]);

export const partnershipsTable = sqliteTable("partnerships", {
  partnershipId: integer("partnership_id").primaryKey({ autoIncrement: true }),
  matchId: text("match_id").references(() => matchesTable.matchId, { onDelete: "cascade" }),
  inningsId: integer("innings_id").references(() => inningsTable.inningsId, { onDelete: "cascade" }),
  batter1Id: integer("batter1_id").references(() => playersTable.playerId),
  batter2Id: integer("batter2_id").references(() => playersTable.playerId),
  runs: integer("runs").default(0).notNull(),
  balls: integer("balls").default(0).notNull(),
  unbroken: integer("unbroken", { mode: "boolean" }).default(true).notNull(),
  wicketSeq: integer("wicket_seq").default(0).notNull(),
});

// ============================================================================
// PRECOMPUTED ANALYTICS TABLES
// ============================================================================

export const factBowlingSpellsTable = sqliteTable("fact_bowling_spells", {
  spellId: integer("spell_id").primaryKey({ autoIncrement: true }),
  matchId: text("match_id").references(() => matchesTable.matchId, { onDelete: "cascade" }),
  inningsId: integer("innings_id").references(() => inningsTable.inningsId, { onDelete: "cascade" }),
  bowlerId: integer("bowler_id").references(() => playersTable.playerId),
  wickets: integer("wickets").default(0).notNull(),
  runsConceded: integer("runs_conceded").default(0).notNull(),
  balls: integer("balls").default(0).notNull(),
  economyRate: real("economy_rate").default(0.0).notNull(),
  bowlingStrikeRate: real("bowling_strike_rate").default(0.0).notNull(),
});

export const factBattingInningsTable = sqliteTable("fact_batting_innings", {
  battingId: integer("batting_id").primaryKey({ autoIncrement: true }),
  matchId: text("match_id").references(() => matchesTable.matchId, { onDelete: "cascade" }),
  inningsId: integer("innings_id").references(() => inningsTable.inningsId, { onDelete: "cascade" }),
  strikerId: integer("striker_id").references(() => playersTable.playerId),
  runs: integer("runs").default(0).notNull(),
  ballsFaced: integer("balls_faced").default(0).notNull(),
  fours: integer("fours").default(0).notNull(),
  sixes: integer("sixes").default(0).notNull(),
  wasDismissed: integer("was_dismissed", { mode: "boolean" }).default(false).notNull(),
  strikeRate: real("strike_rate").default(0.0).notNull(),
});

export const dimScenarioTable = sqliteTable("dim_scenario", {
  scenarioId: integer("scenario_id").primaryKey({ autoIncrement: true }),
  scenarioName: text("scenario_name").unique().notNull(),
});

export const dimTeamMatchBridgeTable = sqliteTable("dim_team_match_bridge", {
  bridgeId: integer("bridge_id").primaryKey({ autoIncrement: true }),
  matchId: text("match_id").references(() => matchesTable.matchId, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teamsTable.teamId),
});

// ============================================================================
// PRECOMPUTED ANALYTICS TABLES
// ============================================================================

export const playerCareerStatsTable = sqliteTable("player_career_stats", {
  playerId: integer("player_id").primaryKey().references(() => playersTable.playerId, { onDelete: "cascade" }),
  role: text("role"),
  matches: integer("matches").default(0).notNull(),
  innings: integer("innings").default(0).notNull(),
  runs: integer("runs").default(0).notNull(),
  balls: integer("balls").default(0).notNull(),
  average: real("average").default(0.0).notNull(),
  strikeRate: real("strike_rate").default(0.0).notNull(),
  fours: integer("fours").default(0).notNull(),
  sixes: integer("sixes").default(0).notNull(),
  fifties: integer("fifties").default(0).notNull(),
  hundreds: integer("hundreds").default(0).notNull(),
  highestScore: integer("highest_score").default(0).notNull(),
  wickets: integer("wickets").default(0).notNull(),
  economy: real("economy").default(0.0).notNull(),
  bowlingAverage: real("bowling_average").default(0.0).notNull(),
  bowlingStrikeRate: real("bowling_strike_rate").default(0.0).notNull(),
  fiveWickets: integer("five_wickets").default(0).notNull(),
  bestFigures: text("best_figures").default("0/0").notNull(),
});

export const playerTeamStatsTable = sqliteTable("player_team_stats", {
  playerId: integer("player_id").references(() => playersTable.playerId, { onDelete: "cascade" }).notNull(),
  teamId: integer("team_id").references(() => teamsTable.teamId, { onDelete: "cascade" }).notNull(),
  matches: integer("matches").default(0).notNull(),
  innings: integer("innings").default(0).notNull(),
  runs: integer("runs").default(0).notNull(),
  balls: integer("balls").default(0).notNull(),
  average: real("average").default(0.0).notNull(),
  strikeRate: real("strike_rate").default(0.0).notNull(),
  wickets: integer("wickets").default(0).notNull(),
  economy: real("economy").default(0.0).notNull(),
}, (t) => [
  primaryKey({ columns: [t.playerId, t.teamId] })
]);

export const playerSeasonStatsTable = sqliteTable("player_season_stats", {
  playerId: integer("player_id").references(() => playersTable.playerId, { onDelete: "cascade" }).notNull(),
  seasonId: text("season_id").references(() => seasonsTable.seasonId, { onDelete: "cascade" }).notNull(),
  matches: integer("matches").default(0).notNull(),
  innings: integer("innings").default(0).notNull(),
  runs: integer("runs").default(0).notNull(),
  balls: integer("balls").default(0).notNull(),
  average: real("average").default(0.0).notNull(),
  strikeRate: real("strike_rate").default(0.0).notNull(),
  wickets: integer("wickets").default(0).notNull(),
  economy: real("economy").default(0.0).notNull(),
}, (t) => [
  primaryKey({ columns: [t.playerId, t.seasonId] })
]);

export const playerTeamHistoryTable = sqliteTable("player_team_history", {
  historyId: integer("history_id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id").references(() => playersTable.playerId, { onDelete: "cascade" }).notNull(),
  teamId: integer("team_id").references(() => teamsTable.teamId, { onDelete: "cascade" }).notNull(),
  seasonId: text("season_id").references(() => seasonsTable.seasonId, { onDelete: "cascade" }).notNull(),
  startSeasonId: text("start_season_id").references(() => seasonsTable.seasonId, { onDelete: "set null" }),
  endSeasonId: text("end_season_id").references(() => seasonsTable.seasonId, { onDelete: "set null" }),
  currentTeam: integer("current_team", { mode: "boolean" }).default(false).notNull(),
  squadRole: text("squad_role"),
  franchiseRole: text("franchise_role"),
  representationScope: text("representation_scope").default("franchise-legacy").notNull(),
}, (t) => [
  unique("unique_player_team_season").on(t.playerId, t.teamId, t.seasonId)
]);

export const currentSquadTable = sqliteTable("current_squad", {
  squadId: integer("squad_id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id").references(() => playersTable.playerId, { onDelete: "cascade" }).notNull(),
  teamId: integer("team_id").references(() => teamsTable.teamId, { onDelete: "cascade" }).notNull(),
  seasonId: text("season_id").references(() => seasonsTable.seasonId, { onDelete: "cascade" }),
  role: text("role"),
  designation: text("designation"),
}, (t) => [
  unique("unique_player_squad").on(t.playerId, t.teamId)
]);

export const playerPhaseStatsTable = sqliteTable("player_phase_stats", {
  playerId: integer("player_id").references(() => playersTable.playerId, { onDelete: "cascade" }).notNull(),
  phase: text("phase").notNull(), // 'powerplay', 'middle', 'death'
  battingRuns: integer("batting_runs").default(0).notNull(),
  battingBalls: integer("batting_balls").default(0).notNull(),
  battingStrikeRate: real("batting_strike_rate").default(0.0).notNull(),
  bowlingRuns: integer("bowling_runs").default(0).notNull(),
  bowlingBalls: integer("bowling_balls").default(0).notNull(),
  bowlingWickets: integer("bowling_wickets").default(0).notNull(),
  bowlingEconomy: real("bowling_economy").default(0.0).notNull(),
}, (t) => [
  primaryKey({ columns: [t.playerId, t.phase] })
]);

export const batterBowlerMatchupStatsTable = sqliteTable("batter_bowler_matchup_stats", {
  batterId: integer("batter_id").references(() => playersTable.playerId, { onDelete: "cascade" }).notNull(),
  bowlerId: integer("bowler_id").references(() => playersTable.playerId, { onDelete: "cascade" }).notNull(),
  runs: integer("runs").default(0).notNull(),
  balls: integer("balls").default(0).notNull(),
  dismissals: integer("dismissals").default(0).notNull(),
  fours: integer("fours").default(0).notNull(),
  sixes: integer("sixes").default(0).notNull(),
  strikeRate: real("strike_rate").default(0.0).notNull(),
  average: real("average").default(0.0).notNull(),
}, (t) => [
  primaryKey({ columns: [t.batterId, t.bowlerId] })
]);

export const venueIntelligenceTable = sqliteTable("venue_intelligence", {
  venueId: integer("venue_id").primaryKey().references(() => venuesTable.venueId, { onDelete: "cascade" }),
  matches: integer("matches").default(0).notNull(),
  avg1stInnings: real("avg_1st_innings").default(0.0).notNull(),
  avg2ndInnings: real("avg_2nd_innings").default(0.0).notNull(),
  battingFirstWinPct: real("batting_first_win_pct").default(0.0).notNull(),
  chasingWinPct: real("chasing_win_pct").default(0.0).notNull(),
  pitchType: text("pitch_type").default("Balanced").notNull(),
});

export const teamIntelligenceTable = sqliteTable("team_intelligence", {
  teamId: integer("team_id").primaryKey().references(() => teamsTable.teamId, { onDelete: "cascade" }),
  matches: integer("matches").default(0).notNull(),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  winPct: real("win_pct").default(0.0).notNull(),
  titles: integer("titles").default(0).notNull(),
  avgScore: real("avg_score").default(0.0).notNull(),
  avgEconomy: real("avg_economy").default(0.0).notNull(),
});

export const auctionRoiTable = sqliteTable("auction_roi", {
  playerId: integer("player_id").primaryKey().references(() => playersTable.playerId, { onDelete: "cascade" }),
  basePrice: real("base_price"), // in Lakhs
  salePrice: real("sale_price"), // in Crores
  boughtByTeamId: integer("bought_by_team_id").references(() => teamsTable.teamId),
  form: integer("form"),
  clutch: integer("clutch"),
  versatility: integer("versatility"),
  expectedValue: real("expected_value"), // in Crores
  roiMultiplier: real("roi_multiplier"), // expectedValue / salePrice
});

// ============================================================================
// CONTENT TABLES
// ============================================================================

export const articlesTable = sqliteTable("articles", {
  articleId: integer("article_id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  content: text("content"),
  tag: text("tag"),
  readTime: text("read_time"),
  publishedDate: text("published_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const reportsTable = sqliteTable("reports", {
  reportId: integer("report_id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  tag: text("tag"),
  frequency: text("frequency"),
  fileUrl: text("file_url"),
});

export const feedEventsTable = sqliteTable("feed_events", {
  eventId: integer("event_id").primaryKey({ autoIncrement: true }),
  matchId: text("match_id").references(() => matchesTable.matchId, { onDelete: "cascade" }),
  time: text("time"),
  type: text("type"), // 'score', 'alert', 'momentum', 'ai', 'info'
  message: text("message").notNull(),
  icon: text("icon"),
});

export const aiInsightsTable = sqliteTable("ai_insights", {
  insightId: integer("insight_id").primaryKey({ autoIncrement: true }),
  matchId: text("match_id").references(() => matchesTable.matchId, { onDelete: "cascade" }),
  title: text("title").notNull(),
  insight: text("insight").notNull(),
  confidence: integer("confidence").notNull(),
});

export const pulseEventsTable = sqliteTable("pulse_events", {
  pulseId: integer("pulse_id").primaryKey({ autoIncrement: true }),
  matchId: text("match_id").references(() => matchesTable.matchId, { onDelete: "cascade" }).notNull(),
  overNum: integer("over_num").notNull(),
  team1Momentum: integer("team1_momentum"),
  team2Momentum: integer("team2_momentum"),
  excitement: integer("excitement"),
  anxiety: integer("anxiety"),
  shock: integer("shock"),
  hope: integer("hope"),
}, (t) => [
  unique("unique_pulse_over").on(t.matchId, t.overNum)
]);

// ============================================================================
// SYSTEM TABLES
// ============================================================================

export const usersTable = sqliteTable("users", {
  userId: integer("user_id").primaryKey({ autoIncrement: true }),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const savedQueriesTable = sqliteTable("saved_queries", {
  queryId: integer("query_id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => usersTable.userId, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filters: text("filters", { mode: "json" }).notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const queryHistoryTable = sqliteTable("query_history", {
  historyId: integer("history_id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => usersTable.userId, { onDelete: "cascade" }),
  filters: text("filters", { mode: "json" }).notNull(),
  executedAt: text("executed_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const favoritesTable = sqliteTable("favorites", {
  favoriteId: integer("favorite_id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => usersTable.userId, { onDelete: "cascade" }).notNull(),
  targetType: text("target_type").notNull(), // 'player', 'team', 'venue'
  targetId: text("target_id").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (t) => [
  unique("unique_user_favorite").on(t.userId, t.targetType, t.targetId)
]);

export const clutchIndexTable = sqliteTable("clutch_index", {
  playerId: integer("player_id").primaryKey().references(() => playersTable.playerId, { onDelete: "cascade" }),
  clutchScore: real("clutch_score").default(0.0).notNull(),
  clutchRuns: integer("clutch_runs").default(0).notNull(),
  clutchWickets: integer("clutch_wickets").default(0).notNull(),
  strikeRate: real("strike_rate").default(0.0).notNull(),
  economy: real("economy").default(0.0).notNull(),
});

export const momentumTrackerTable = sqliteTable("momentum_tracker", {
  trackerId: integer("tracker_id").primaryKey({ autoIncrement: true }),
  matchId: text("match_id").references(() => matchesTable.matchId, { onDelete: "cascade" }).notNull(),
  inningsNumber: integer("innings_number").notNull(),
  overNum: integer("over_num").notNull(),
  runs: integer("runs").default(0).notNull(),
  wickets: integer("wickets").default(0).notNull(),
  momentumScore: real("momentum_score").default(0.0).notNull(),
});

export const partnershipStatsTable = sqliteTable("partnership_stats", {
  partnershipId: integer("partnership_id").primaryKey({ autoIncrement: true }),
  matchId: text("match_id").references(() => matchesTable.matchId, { onDelete: "cascade" }).notNull(),
  batter1Id: integer("batter1_id").references(() => playersTable.playerId).notNull(),
  batter2Id: integer("batter2_id").references(() => playersTable.playerId).notNull(),
  totalRuns: integer("total_runs").default(0).notNull(),
  totalBalls: integer("total_balls").default(0).notNull(),
  centuryPartnerships: integer("century_partnerships").default(0).notNull(),
  halfCenturyPartnerships: integer("half_century_partnerships").default(0).notNull(),
});

// ============================================================================
// MIGRATION SCHEMAS FOR INSERT VALIDATION
// ============================================================================

export const insertTeamSchema = createInsertSchema(teamsTable);
export const insertPlayerSchema = createInsertSchema(playersTable);
export const insertVenueSchema = createInsertSchema(venuesTable);
export const insertSeasonSchema = createInsertSchema(seasonsTable);
export const insertMatchSchema = createInsertSchema(matchesTable);
export const insertInningsSchema = createInsertSchema(inningsTable);
export const insertDeliverySchema = createInsertSchema(deliveriesTable);
export const insertDismissalSchema = createInsertSchema(dismissalsTable);
export const insertPartnershipSchema = createInsertSchema(partnershipsTable);
export const insertArticleSchema = createInsertSchema(articlesTable);
export const insertReportSchema = createInsertSchema(reportsTable);
export const insertFeedEventSchema = createInsertSchema(feedEventsTable);
export const insertAiInsightSchema = createInsertSchema(aiInsightsTable);
export const insertPulseEventSchema = createInsertSchema(pulseEventsTable);
export const insertPlayerTeamHistorySchema = createInsertSchema(playerTeamHistoryTable);
export const insertCurrentSquadSchema = createInsertSchema(currentSquadTable);
export const insertClutchIndexSchema = createInsertSchema(clutchIndexTable);
export const insertMomentumTrackerSchema = createInsertSchema(momentumTrackerTable);
export const insertPartnershipStatsSchema = createInsertSchema(partnershipStatsTable);

export const insertFactBowlingSpellsSchema = createInsertSchema(factBowlingSpellsTable);
export const insertFactBattingInningsSchema = createInsertSchema(factBattingInningsTable);
export const insertDimScenarioSchema = createInsertSchema(dimScenarioTable);
export const insertDimTeamMatchBridgeSchema = createInsertSchema(dimTeamMatchBridgeTable);

export type Team = typeof teamsTable.$inferSelect;
export type Player = typeof playersTable.$inferSelect;
export type Venue = typeof venuesTable.$inferSelect;
export type Season = typeof seasonsTable.$inferSelect;
export type Match = typeof matchesTable.$inferSelect;
export type Innings = typeof inningsTable.$inferSelect;
export type Delivery = typeof deliveriesTable.$inferSelect;
export type Dismissal = typeof dismissalsTable.$inferSelect;
export type Partnership = typeof partnershipsTable.$inferSelect;
export type Article = typeof articlesTable.$inferSelect;
export type Report = typeof reportsTable.$inferSelect;
export type FeedEvent = typeof feedEventsTable.$inferSelect;
export type AiInsight = typeof aiInsightsTable.$inferSelect;
export type PulseEvent = typeof pulseEventsTable.$inferSelect;
export type PlayerTeamHistory = typeof playerTeamHistoryTable.$inferSelect;
export type CurrentSquad = typeof currentSquadTable.$inferSelect;
export type ClutchIndex = typeof clutchIndexTable.$inferSelect;
export type MomentumTracker = typeof momentumTrackerTable.$inferSelect;
export type PartnershipStats = typeof partnershipStatsTable.$inferSelect;
export type FactBowlingSpell = typeof factBowlingSpellsTable.$inferSelect;
export type FactBattingInnings = typeof factBattingInningsTable.$inferSelect;
export type DimScenario = typeof dimScenarioTable.$inferSelect;
export type DimTeamMatchBridge = typeof dimTeamMatchBridgeTable.$inferSelect;