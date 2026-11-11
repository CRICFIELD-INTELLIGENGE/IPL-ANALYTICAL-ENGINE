// Decision Intelligence OS routes (/ai-analyst modules).
//
//   GET  /api/players/:id/summary          Slice 1 — player data layer
//   GET  /api/optimizer/franchises         Slice 2 — squads available for a season
//   POST /api/optimizer/playing-xi         Slice 2 — MILP Playing XI optimizer
//   POST /api/ask                          Phase 1 — natural-language stats question
//   POST /api/ask/run                      Phase 1 — run an edited structured query
//   GET  /api/history/overview             Phase 1 — historical database coverage & health
//   GET  /api/players/search?q=            Phase 2 — player picker
//   GET  /api/weakness/:id                 Phase 2 — Hidden Weakness Detector
//   GET  /api/pressure/leaders             Phase 2 — Pressure Genome leaderboards
//   GET  /api/pressure/:id                 Phase 2 — Pressure Genome profile
//   GET  /api/insights/daily?date=         Phase 2 — AI Insight Feed for a day
//   GET  /api/insights/pool/:category      Phase 2 — every candidate in a feed category

import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { z } from "zod";
import { getDecisionDbError } from "../services/decision/db";
import { getSeasons, isWarehouseReady } from "../services/decision/player-profiles";
import { getPlayerSummary, resolvePlayerId, searchPlayers } from "../services/decision/player-summary";
import { scanPlayer } from "../services/decision/weakness-detector";
import { getPressureGenome, getPressureLeaders } from "../services/decision/pressure-genome";
import { getDailyFeed, getInsightPool, type InsightCategory } from "../services/decision/insight-feed";
import { latestSeason, listFranchises, optimizePlayingXi } from "../services/decision/playing-xi";
import { getHistoryOverview } from "../services/decision/history";
import { parseQuestion } from "../services/decision/nl-parser";
import { METRICS, runStatQuery, type MetricId } from "../services/decision/stats-engine";

const router = Router();

let warehouseErrorLogged = false;
function logWarehouseErrorOnce(detail: string | null) {
  if (warehouseErrorLogged) return;
  warehouseErrorLogged = true;
  logger.error({ detail }, "IPL warehouse unavailable");
}

function requireWarehouse(res: Response): boolean {
  if (isWarehouseReady()) return true;
  // The internal error names the server's file path; it is logged, never returned to the client.
  logWarehouseErrorOnce(getDecisionDbError());
  res.status(503).json({ error: "warehouse_unavailable", detail: "The IPL data warehouse is not available on this server." });
  return false;
}

const seasonSchema = z
  .string()
  .regex(/^\d{4}$/, "season must be a 4-digit year")
  .refine((s) => getSeasons().includes(s), { message: "no data for that season" });

router.get("/players/:id/summary", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const id = resolvePlayerId(String(req.params.id));
  const summary = id === null ? null : getPlayerSummary(id);
  if (!summary) {
    res.status(404).json({ error: "player_not_found", id: req.params.id });
    return;
  }
  res.json(summary);
});

router.get("/optimizer/franchises", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = seasonSchema.optional().safeParse(req.query.season || undefined);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const season = parsed.data ?? latestSeason();
  res.json({ season, seasons: getSeasons().slice().reverse(), franchises: listFranchises(season) });
});

const playingXiSchema = z.object({
  teamId: z.number().int().positive(),
  season: seasonSchema.optional(),
  squadPlayerIds: z.array(z.number().int().positive()).max(40).optional(),
  pitch: z.enum(["balanced", "batting", "pace", "spin"]).default("balanced"),
  maxOverseas: z.number().int().min(0).max(11).default(4),
  minBowlingOvers: z.number().int().min(0).max(44).default(20),
  minBowlingOptions: z.number().int().min(0).max(11).default(5),
  minBattingOptions: z.number().int().min(0).max(11).default(6),
  minSpinners: z.number().int().min(0).max(11).optional(),
  minPacers: z.number().int().min(0).max(11).optional(),
  lockedIds: z.array(z.number().int().positive()).max(11).default([]),
  excludedIds: z.array(z.number().int().positive()).max(40).default([]),
  overrides: z
    .array(z.object({ playerId: z.number().int().positive(), overseas: z.boolean().optional(), keeper: z.boolean().optional() }))
    .max(40)
    .default([]),
});

router.post("/optimizer/playing-xi", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = playingXiSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    res.json(optimizePlayingXi(parsed.data));
  } catch (err) {
    req.log?.error({ err }, "playing-xi optimizer failed");
    res.status(500).json({ error: "optimizer_failed" });
  }
});

/* ─── Phase 1: Ask the database ─────────────────────────────────────────── */

const ids = z.array(z.number().int().positive()).max(60).optional();
const year = z.number().int().min(2000).max(2100).optional();
const statQuerySchema = z.object({
  perspective: z.enum(["batting", "bowling", "results", "team_innings"]),
  metric: z.enum(Object.keys(METRICS) as [MetricId, ...MetricId[]]),
  groupBy: z.enum(["player", "season", "team", "opponent", "venue", "phase", "innings"]),
  order: z.enum(["asc", "desc"]),
  sortBy: z.enum(["metric", "key"]).default("metric"),
  limit: z.number().int().min(1).max(50).default(10),
  minVolume: z.number().int().min(0).max(100000).optional(),
  filters: z.object({
    seasonFrom: year,
    seasonTo: year,
    phase: z.enum(["powerplay", "middle", "death"]).optional(),
    overFrom: z.number().int().min(1).max(20).optional(),
    overTo: z.number().int().min(1).max(20).optional(),
    teamIds: ids,
    opponentIds: ids,
    venueIds: ids,
    innings: z.union([z.literal(1), z.literal(2)]).optional(),
    stage: z.enum(["league", "playoffs", "final"]).optional(),
    playerIds: ids,
    vsPlayerIds: ids,
    bowlingType: z.enum(["pace", "spin"]).optional(),
    battingHand: z.enum(["L", "R"]).optional(),
    nationality: z.enum(["overseas", "indian"]).optional(),
  }).strict(),
});

const ASK_SUGGESTIONS = [
  "Most runs in IPL 2025",
  "Best economy in the death overs since 2022",
  "Kohli vs Bumrah",
  "Highest individual scores",
  "CSK vs MI head to head",
  "Which venue is best for spinners?",
];

router.post("/ask", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ question: z.string().trim().min(2).max(300) }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const { understood, query, notes } = parseQuestion(parsed.data.question);
    if (!understood || !query) {
      res.json({ understood: false, question: parsed.data.question, notes, suggestions: ASK_SUGGESTIONS });
      return;
    }
    res.json({ understood: true, question: parsed.data.question, notes, result: runStatQuery(query) });
  } catch (err) {
    req.log?.error({ err, question: parsed.data.question }, "ask failed");
    res.status(500).json({ error: "ask_failed" });
  }
});

router.post("/ask/run", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ query: statQuerySchema }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    res.json({ understood: true, notes: [], result: runStatQuery(parsed.data.query) });
  } catch (err) {
    req.log?.error({ err }, "ask/run failed");
    res.status(500).json({ error: "ask_failed" });
  }
});

router.get("/history/overview", (_req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  res.json(getHistoryOverview());
});

/* ─── Phase 2: Discovery ────────────────────────────────────────────────── */

const sideSchema = z.enum(["batting", "bowling"]).optional();

router.get("/players/search", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ q: z.string().trim().min(2).max(60), limit: z.coerce.number().int().min(1).max(20).default(8) }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  res.json(searchPlayers(parsed.data.q, parsed.data.limit));
});

router.get("/weakness/:id", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ window: z.enum(["recent", "career"]).default("recent"), side: sideSchema }).safeParse(req.query);
  const id = resolvePlayerId(String(req.params.id));
  if (!parsed.success || id === null) {
    res.status(parsed.success ? 404 : 400).json(parsed.success ? { error: "player_not_found" } : { error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const report = scanPlayer(id, parsed.data.window, parsed.data.side);
  if (!report) {
    res.status(404).json({ error: "no_balls", detail: "No balls for this player in that window." });
    return;
  }
  res.json(report);
});

const genomeQuery = z.object({ window: z.enum(["career", "recent"]).default("career"), side: sideSchema });

router.get("/pressure/leaders", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = genomeQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  res.json(getPressureLeaders(parsed.data.side ?? "batting", parsed.data.window));
});

router.get("/pressure/:id", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = genomeQuery.safeParse(req.query);
  const id = resolvePlayerId(String(req.params.id));
  if (!parsed.success || id === null) {
    res.status(parsed.success ? 404 : 400).json(parsed.success ? { error: "player_not_found" } : { error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const genome = getPressureGenome(id, parsed.data.window, parsed.data.side);
  if (!genome) {
    res.status(404).json({ error: "no_balls", detail: "No balls for this player in that window." });
    return;
  }
  res.json(genome);
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "invalid date");

router.get("/insights/daily", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ date: isoDate.optional() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  res.json(getDailyFeed(parsed.data.date ?? new Date().toISOString().slice(0, 10)));
});

const categories = ["player_rise", "venue_pattern", "matchup_anomaly", "auction_opportunity", "tactical_trend"] as const;

router.get("/insights/pool/:category", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.enum(categories).safeParse(req.params.category);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  res.json(getInsightPool(parsed.data as InsightCategory));
});

export default router;
