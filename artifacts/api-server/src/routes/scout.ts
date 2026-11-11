// Scout Lab API Routes (/api/scout/*).
//
// Endpoints:
//   GET /api/scout/rankings     — League-adjusted, shrunk player rankings with filters and pagination
//   GET /api/scout/player/:id   — Multi-league player profile, verified attributes vs statistical roles, trends, similar players
//   GET /api/scout/compare      — Head-to-head comparison for 2-5 players with radar and delta metrics
//   GET /api/scout/roles        — Deterministic role taxonomy, definitions, usage thresholds, and active counts
//
// Constraints:
//   - Zero raw SQL execution exposed to clients.
//   - All parameters validated with Zod.
//   - Read-only queries over global.db.
//   - Automated franchise recommendations NOT exposed until squad eligibility & valuations verified.

import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { z } from "zod";
import { isGlobalDbReady, getGlobalDbError } from "../services/scout/db";
import { computeBayesianTrueTalent, computeMarkovWinProbability } from "../services/scout/true-talent-model";
import {
  ratePlayers,
  resolvePlayer,
  playerAttributes,
  seasonLines,
  trends,
  similarPlayers,
  strengthsAndWeaknesses,
  iplAppearances,
  debutSeason,
  getRoleCatalog,
  listCompetitions,
  searchPlayers,
  metricDefs,
  fmtMetric,
  rankingSortKeys,
  sortRatings,
  type Discipline,
  type PhaseKey,
  type Rating,
} from "../services/scout/scout-service";

const router = Router();

/** Sample needed for a percentile (the documented "rankable" tier). */
const RANKABLE_BALLS = 120;

function requireGlobalWarehouse(res: Response): boolean {
  if (isGlobalDbReady()) return true;
  res.status(503).json({
    error: "global_warehouse_unavailable",
    // The internal error names the server's file path; it is logged, never returned to the client.
    detail: (logger.error({ detail: getGlobalDbError() }, "global warehouse unavailable"), "The global data warehouse is not available on this server."),
  });
  return false;
}

// ── Search: Autocomplete Player Search ───────────────────────────────────────

router.get("/search", (req: Request, res: Response): void => {
  if (!requireGlobalWarehouse(res)) return;
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.json({ results: [] });
    return;
  }
  const results = searchPlayers(q, 15);
  res.json({ results });
});

// ── 1. GET /api/scout/rankings ─────────────────────────────────────────────

// Role labels produced by battingRole()/bowlingRole() (roles-v1), per discipline.
const RANKING_ROLES: Record<Discipline, string[]> = {
  batting: ["opener", "top_order", "middle_order", "finisher", "lower_order", "insufficient"],
  bowling: ["powerplay_specialist", "middle_specialist", "death_specialist", "multi_phase", "part_time", "insufficient", "none"],
};

const rankingsQuerySchema = z.object({
  discipline: z.enum(["batting", "bowling"]).default("batting"),
  competitions: z.string().optional(), // Comma-separated: "ipl,smat,bbl"
  phase: z.enum(["all", "powerplay", "middle", "death"]).default("all"),
  role: z.string().optional(),
  minBalls: z.coerce.number().int().min(0).max(10000).default(120),
  recentSeasons: z.coerce.number().int().min(1).max(20).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().default("shrunk"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().max(60).optional(),
}).superRefine((q, ctx) => {
  // Unknown sort keys used to be accepted and silently left the list unsorted.
  if (!rankingSortKeys(q.discipline).includes(q.sortBy)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sortBy"], message: `sortBy must be one of: ${rankingSortKeys(q.discipline).join(", ")}` });
  }
  // A role from the other discipline used to return an empty list with no explanation.
  if (q.role && !RANKING_ROLES[q.discipline].includes(q.role)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["role"], message: `role must be one of: ${RANKING_ROLES[q.discipline].join(", ")}` });
  }
});

router.get("/rankings", (req: Request, res: Response): void => {
  if (!requireGlobalWarehouse(res)) return;

  const parsed = rankingsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_parameters", issues: parsed.error.issues });
    return;
  }

  const {
    discipline,
    competitions: compsParam,
    phase,
    role,
    minBalls,
    recentSeasons,
    page,
    limit,
    sortBy,
    sortOrder,
    search,
  } = parsed.data;

  const availableComps = listCompetitions().map((c) => c.code);
  let targetComps = compsParam
    ? compsParam.split(",").map((s) => s.trim().toLowerCase()).filter((s) => availableComps.includes(s))
    : availableComps;

  if (targetComps.length === 0) targetComps = availableComps;

  const ratings = ratePlayers({
    discipline,
    competitions: targetComps,
    phase,
    minBalls,
    recentSeasons,
    roles: role ? [role] : undefined,
  });

  // Eligibility before search, sort and pagination: only rows with at least `minBalls`
  // balls (and at least one ball — a zero-ball row has nothing to rank) are listed.
  // These are exactly the rows that received percentiles.
  const eligible = ratings.filter((r) => r.balls >= Math.max(1, minBalls));

  let filtered = eligible;
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    // `name` is the register's unique_name when one exists (COALESCE in the service).
    filtered = eligible.filter((r) => r.name.toLowerCase().includes(term));
  }

  // Sorting: metric sorts respect each metric's direction ("desc" = best first).
  const sorted = sortRatings(filtered, sortBy, sortOrder, discipline);

  const total = sorted.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const paginated = sorted.slice(offset, offset + limit).map((r) => {
    const sw = strengthsAndWeaknesses(r);
    return {
      ...r,
      strengths: sw.strengths,
      weaknesses: sw.weaknesses,
    };
  });

  res.json({
    filters: {
      discipline,
      competitions: targetComps,
      phase,
      role: role ?? null,
      minBalls,
      recentSeasons: recentSeasons ?? null,
      sortBy,
      sortOrder,
      search: search ?? null,
    },
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
    data: paginated,
  });
});

// ── 2. GET /api/scout/player/:id ───────────────────────────────────────────

router.get("/player/:id", (req: Request, res: Response): void => {
  if (!requireGlobalWarehouse(res)) return;

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
  const resolution = resolvePlayer(rawId);

  if (!resolution.player) {
    res.status(404).json({
      error: "player_not_found",
      searched: rawId,
      candidates: resolution.candidates,
      detail: resolution.candidates.length > 1 ? "ambiguous_name" : "no_record_in_global_database",
    });
    return;
  }

  const p = resolution.player;
  const attributes = playerAttributes(p.player_key);
  const lines = seasonLines(p.player_key);
  const playerTrends = trends(p.player_key);
  const comps = listCompetitions().map((c) => c.code);

  const battingRatings = ratePlayers({
    discipline: "batting",
    competitions: comps,
    playerKeys: [p.player_key],
    minBalls: RANKABLE_BALLS, // percentiles vs the rankable population (>= 120 balls)
  });

  const bowlingRatings = ratePlayers({
    discipline: "bowling",
    competitions: comps,
    playerKeys: [p.player_key],
    minBalls: RANKABLE_BALLS, // percentiles vs the rankable population (>= 120 balls)
  });

  // A zero-ball row (e.g. only ever at the non-striker's end) has no measurable rate.
  const allRatings = [...battingRatings, ...bowlingRatings].filter((r) => r.balls > 0);
  const primaryRating = allRatings.sort((a, b) => b.balls - a.balls)[0] ?? null;
  const sw = primaryRating ? strengthsAndWeaknesses(primaryRating) : { strengths: [], weaknesses: [] };

  const primaryDiscipline: Discipline =
    bowlingRatings.reduce((s, r) => s + r.balls, 0) > battingRatings.reduce((s, r) => s + r.balls, 0)
      ? "bowling"
      : "batting";

  const similar = similarPlayers(p.player_key, {
    discipline: primaryDiscipline,
    competitions: comps,
    limit: 6,
  });

  const debutSeasons: Record<string, string | null> = {};
  for (const c of comps) {
    const d = debutSeason(p.player_key, c);
    if (d) debutSeasons[c] = d;
  }

  res.json({
    player: {
      player_key: p.player_key,
      cricsheet_id: p.cricsheet_id,
      name: p.name,
      unique_name: p.unique_name,
    },
    verifiedAttributes: attributes,
    contextSummary: {
      iplAppearances: iplAppearances(p.player_key),
      debutSeasons,
      primaryDiscipline,
      competitionsPlayed: [...new Set(lines.map((l) => l.competition))],
    },
    seasonLines: lines,
    ratings: allRatings,
    trends: playerTrends,
    strengthsAndWeaknesses: sw,
    similarPlayers: similar.similar.map((s) => ({
      player_key: s.player_key,
      cricsheet_id: s.cricsheet_id,
      name: s.name,
      competition: s.competition,
      distance: Math.round(s.distance * 100) / 100,
      role: s.role,
      tier: s.tier,
      balls: s.balls,
      metrics: s.metrics,
    })),
  });
});

// ── 3. GET /api/scout/compare ──────────────────────────────────────────────

const compareQuerySchema = z.object({
  ids: z.string().min(1), // Comma-separated: "f1809c03,31ee319e" or "12,45"
  discipline: z.enum(["batting", "bowling"]).default("batting"),
  competitions: z.string().optional(),
  phase: z.enum(["all", "powerplay", "middle", "death"]).default("all"),
  recentSeasons: z.coerce.number().int().min(1).max(20).optional(),
});

router.get("/compare", (req: Request, res: Response): void => {
  if (!requireGlobalWarehouse(res)) return;

  const parsed = compareQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_parameters", issues: parsed.error.issues });
    return;
  }

  const { ids: idsParam, discipline, competitions: compsParam, phase, recentSeasons } = parsed.data;
  const rawIds = idsParam.split(",").map((s) => s.trim()).filter(Boolean);

  if (rawIds.length < 2 || rawIds.length > 5) {
    res.status(400).json({
      error: "invalid_player_count",
      message: "Scout Lab compare requires between 2 and 5 players",
      received: rawIds.length,
    });
    return;
  }

  const resolved = rawIds.map((id) => ({ input: id, ...resolvePlayer(id) }));
  const missing = resolved.filter((r) => !r.player);
  if (missing.length > 0) {
    res.status(404).json({
      error: "players_not_found",
      missing: missing.map((m) => m.input),
    });
    return;
  }

  const players = resolved.map((r) => r.player!);
  const playerKeys = players.map((p) => p.player_key);

  const availableComps = listCompetitions().map((c) => c.code);
  const targetComps = compsParam
    ? compsParam.split(",").map((s) => s.trim().toLowerCase()).filter((s) => availableComps.includes(s))
    : availableComps;

  const ratings = ratePlayers({
    discipline,
    competitions: targetComps,
    phase,
    recentSeasons,
    playerKeys,
    // Percentiles are ranked against every rankable player in the window, not only the
    // players being compared (previously a 2-player population gave 100th/0th).
    minBalls: RANKABLE_BALLS,
  });

  const defs = metricDefs(discipline);
  const playerProfiles = players.map((p) => {
    // One rating per player: the competition with the most balls in the window.
    const r = ratings.filter((item) => item.player_key === p.player_key).sort((a, b) => b.balls - a.balls)[0] ?? null;
    const attrs = playerAttributes(p.player_key);
    const sw = r ? strengthsAndWeaknesses(r) : { strengths: [], weaknesses: [] };
    return {
      player: p,
      rating: r,
      attributes: attrs,
      strengths: sw.strengths,
      weaknesses: sw.weaknesses,
    };
  });

  // Radar metrics normalized on a 0-100 scale
  const radarMetrics = defs.map((m) => {
    const values: Record<string, number | null> = {};
    for (const item of playerProfiles) {
      const metricVal = item.rating?.metrics[m.id];
      // Percentile only (0–100, 100 = best). Below the rankable sample there is no
      // percentile, so the value is null rather than a shrunk index on another scale.
      const pct = metricVal?.percentile ?? null;
      values[item.player.cricsheet_id] = pct != null ? Math.round(pct * 10) / 10 : null;
    }
    return {
      metric: m.id,
      label: m.label,
      better: m.better,
      unit: m.unit,
      values,
    };
  });

  res.json({
    discipline,
    phase,
    competitions: targetComps,
    players: playerProfiles,
    radarMetrics,
  });
});

// ── 4. GET /api/scout/roles ────────────────────────────────────────────────

router.get("/roles", (_req: Request, res: Response): void => {
  if (!requireGlobalWarehouse(res)) return;
  const catalog = getRoleCatalog();
  res.json(catalog);
});

// ── 5. GET /api/scout/win-probability ──────────────────────────────────────

const winProbQuerySchema = z.object({
  runsNeeded: z.coerce.number().int().min(0).max(400),
  ballsRemaining: z.coerce.number().int().min(1).max(120),
  wicketsRemaining: z.coerce.number().int().min(0).max(10),
  venuePar: z.coerce.number().min(100).max(280).default(165),
});

router.get("/win-probability", (req: Request, res: Response): void => {
  const parsed = winProbQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_win_prob_query",
      message: "Parameters runsNeeded (0-400), ballsRemaining (1-120), and wicketsRemaining (0-10) are required.",
      issues: parsed.error.issues,
    });
    return;
  }

  const { runsNeeded, ballsRemaining, wicketsRemaining, venuePar } = parsed.data;
  const result = computeMarkovWinProbability(runsNeeded, ballsRemaining, wicketsRemaining, venuePar);
  res.json(result);
});

// ── 6. GET /api/scout/bayes-calculator ─────────────────────────────────────

const bayesCalcQuerySchema = z.object({
  metricId: z.string().default("strike_rate"),
  rawIndex: z.coerce.number().min(0).max(300).default(132),
  balls: z.coerce.number().int().min(0).max(5000).default(120),
  discipline: z.enum(["batting", "bowling"]).default("batting"),
});

router.get("/bayes-calculator", (req: Request, res: Response): void => {
  const parsed = bayesCalcQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_bayes_calc_query",
      issues: parsed.error.issues,
    });
    return;
  }

  const { metricId, rawIndex, balls, discipline } = parsed.data;
  const result = computeBayesianTrueTalent(metricId, rawIndex, balls, discipline);
  res.json(result);
});

export default router;
