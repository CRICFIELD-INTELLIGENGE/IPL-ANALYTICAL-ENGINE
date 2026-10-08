// Decision Intelligence OS routes — Phase 3 (simulation), Phase 4 (intelligence)
// and the per-page "intel" panels used by the player, team, venue and match pages.
//
//   GET  /api/decision/catalog                 franchises, seasons and venues for pickers
//   GET  /api/strategy/setup                   likely XIs and attacks for a fixture
//   POST /api/strategy/simulate                Phase 3 — Strategy Simulator
//   GET  /api/alt-universe/matches?q=&season=  Phase 3 — Alternate Universe: match search
//   GET  /api/alt-universe/match/:id           Phase 3 — overs, bowlers, batters of a match
//   POST /api/alt-universe/simulate            Phase 3 — run a what-if
//   GET  /api/replay/matches?q=                Phase 3 — Decision Replay: match search
//   GET  /api/replay/:matchId                  Phase 3 — decision points of a chase
//   GET  /api/opposition?team=&opponent=       Phase 3 — Opposition Exploit Map
//   GET  /api/pool/:id?side=&window=           Phase 4 — Player Pool Graph
//   GET  /api/squad-dna/teams                  Phase 4 — Squad DNA franchise list
//   GET  /api/squad-dna/profile?team=&season=  Phase 4 — one team-season's DNA
//   GET  /api/squad-dna/compare                Phase 4 — two team-seasons side by side
//   GET  /api/war-room/board?view=…            Phase 4 — Auction War Room board
//   GET  /api/war-room/player/:key?view=       Phase 4 — one player's valuation dossier
//   GET  /api/intel/player/:key                panels for /players/:slug
//   GET  /api/intel/team/:key?season=          panels for /teams/:slug
//   GET  /api/intel/venue/:key                 panels for /venues/:slug
//   GET  /api/intel/match/:id                  panels for /match/:id

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getDecisionDbError } from "../services/decision/db";
import { bowlingSubtype, getPlayerMeta, getRoster, getSeasonLines, getSeasons, isWarehouseReady } from "../services/decision/player-profiles";
import { resolvePlayerId } from "../services/decision/player-summary";
import { getFranchiseRefs, getVenueRefs, resolveFranchise, resolveVenue } from "../services/decision/stats-engine";
import { likelyAttack, likelyBattingOrder, teamSeasonSquad } from "../services/decision/match-model";
import { simulateStrategy } from "../services/decision/strategy-sim";
import { altMatchDetail, listAltMatches, simulateAlternate } from "../services/decision/alt-universe";
import { buildReplay, chaseCurve, listReplayMatches } from "../services/decision/decision-replay";
import { buildOppositionMap, profileVenue } from "../services/decision/opposition-map";
import { poolGraph } from "../services/decision/player-pool";
import { compareSquads, squadProfile, squadTeams } from "../services/decision/squad-dna";
import { auctionBoard, auctionIntel, auctionPlayer } from "../services/decision/auction-war-room";
import { getPressureGenome } from "../services/decision/pressure-genome";
import { scanPlayer } from "../services/decision/weakness-detector";
import { summarizeMatch, teamShort } from "../services/decision/innings-snapshot";
import { getBallColumns } from "../services/decision/ball-context";

const router = Router();

function requireWarehouse(res: Response): boolean {
  if (isWarehouseReady()) return true;
  res.status(503).json({ error: "warehouse_unavailable", detail: getDecisionDbError() });
  return false;
}

function bad(res: Response, issues: unknown): void {
  res.status(400).json({ error: "invalid_request", issues });
}

/** Known service errors become 4xx with their code; anything else is a 500. */
function fail(res: Response, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const known: Record<string, number> = {
    unknown_team: 404, same_team: 400, squad_unavailable: 422, innings_not_found: 404,
    innings_already_over: 422, unknown_bowling_type: 400,
  };
  res.status(known[msg] ?? 500).json({ error: known[msg] ? msg : "internal_error", detail: known[msg] ? undefined : msg });
}

const latest = () => Number(getSeasons().at(-1) ?? 2026);
const yearSchema = z.coerce.number().int().min(2008).max(2100).refine((y) => getSeasons().includes(String(y)), { message: "no data for that season" });

/* ─── Catalog ────────────────────────────────────────────────────────────── */

router.get("/decision/catalog", (_req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const season = latest();
  const active = new Set(getRoster(String(season)).map((r) => r.teamId));
  const c = getBallColumns();
  const venueMatches = new Map<number, { n: number; last: string }>();
  for (const m of c.matches) {
    const v = venueMatches.get(m.venue) ?? { n: 0, last: "" };
    v.n++; if (m.season > v.last) v.last = m.season;
    venueMatches.set(m.venue, v);
  }
  res.json({
    latestSeason: season,
    seasons: getSeasons().map(Number).reverse(),
    franchises: getFranchiseRefs().map((f) => ({ short: f.short, name: f.name, active: f.teamIds.some((t) => active.has(t)) })),
    venues: getVenueRefs()
      .map((v) => {
        const st = v.venueIds.map((id) => venueMatches.get(id)).filter(Boolean) as { n: number; last: string }[];
        return { key: v.key, name: v.name, city: v.city, matches: st.reduce((s, x) => s + x.n, 0), lastSeason: Number(st.reduce((s, x) => (x.last > s ? x.last : s), "0")) };
      })
      .filter((v) => v.matches >= 5)
      .sort((a, b) => b.lastSeason - a.lastSeason || b.matches - a.matches),
  });
});

/* ─── Phase 3: Strategy Simulator ────────────────────────────────────────── */

router.get("/strategy/setup", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ battingTeam: z.string().min(1), bowlingTeam: z.string().min(1), season: yearSchema.optional() }).safeParse(req.query);
  if (!parsed.success) return bad(res, parsed.error.issues);
  const season = parsed.data.season ?? latest();
  const bat = resolveFranchise(parsed.data.battingTeam), bowl = resolveFranchise(parsed.data.bowlingTeam);
  if (!bat || !bowl) { res.status(404).json({ error: "unknown_team" }); return; }
  const meta = getPlayerMeta();
  const name = (id: number) => meta.get(id)?.name ?? `#${id}`;
  const bs = teamSeasonSquad(bat.teamIds, season), ws = teamSeasonSquad(bowl.teamIds, season);
  const order = likelyBattingOrder(bs, 11), attack = likelyAttack(ws, 6);
  res.json({
    season,
    batting: {
      short: bat.short, name: bat.name, likelyOrder: order,
      players: bs.battingOrder.slice(0, 18).map((p) => ({ playerId: p.playerId, name: name(p.playerId), avgPosition: Math.round(p.avgPosition * 10) / 10, innings: p.innings })),
    },
    bowling: {
      short: bowl.short, name: bowl.name, likelyAttack: attack,
      players: ws.bowlers.slice(0, 12).map((p) => { const m = meta.get(p.playerId); return { playerId: p.playerId, name: name(p.playerId), overs: p.overs, matches: p.matches, type: (m ? bowlingSubtype(m) : null) ?? "—" }; }),
    },
  });
});

const strategySchema = z.object({
  battingTeam: z.string().min(1),
  bowlingTeam: z.string().min(1),
  season: yearSchema.optional(),
  venue: z.string().optional(),
  target: z.number().int().min(1).max(400),
  runs: z.number().int().min(0).max(400),
  balls: z.number().int().min(0).max(119),
  wickets: z.number().int().min(0).max(9),
  striker: z.number().int().positive().optional(),
  nonStriker: z.number().int().positive().optional(),
  battingOrder: z.array(z.number().int().positive()).max(11).optional(),
  attack: z.array(z.number().int().positive()).min(2).max(8).optional(),
  oversUsed: z.record(z.string().regex(/^\d+$/), z.number().int().min(0).max(4)).optional(),
  sims: z.number().int().min(200).max(5000).optional(),
  seed: z.number().int().optional(),
}).refine((r) => r.runs < r.target, { message: "runs must be below the target (the chase is not over)", path: ["runs"] });

router.post("/strategy/simulate", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = strategySchema.safeParse(req.body);
  if (!parsed.success) return bad(res, parsed.error.issues);
  try { res.json(simulateStrategy(parsed.data)); } catch (err) { fail(res, err); }
});

/* ─── Phase 3: Alternate Universe ────────────────────────────────────────── */

router.get("/alt-universe/matches", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ q: z.string().max(80).optional(), season: z.string().regex(/^\d{4}$/).optional(), limit: z.coerce.number().int().min(1).max(100).default(40) }).safeParse(req.query);
  if (!parsed.success) return bad(res, parsed.error.issues);
  res.json({ matches: listAltMatches(parsed.data.q, parsed.data.season, parsed.data.limit) });
});

router.get("/alt-universe/match/:id", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const d = altMatchDetail(String(req.params.id));
  if (!d) { res.status(404).json({ error: "match_not_found" }); return; }
  res.json(d);
});

const altSchema = z.object({
  matchId: z.string().min(1).max(20),
  innings: z.union([z.literal(1), z.literal(2)]),
  fromOver: z.number().int().min(0).max(19),
  change: z.discriminatedUnion("type", [
    z.object({ type: z.literal("none") }),
    z.object({ type: z.literal("swap_bowler"), out: z.number().int().positive(), in: z.number().int().positive() }),
    z.object({ type: z.literal("bowling_type"), bowlingType: z.string().min(1).max(40) }),
  ]),
  sims: z.number().int().min(200).max(5000).optional(),
  seed: z.number().int().optional(),
});

router.post("/alt-universe/simulate", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = altSchema.safeParse(req.body);
  if (!parsed.success) return bad(res, parsed.error.issues);
  try { res.json(simulateAlternate(parsed.data)); } catch (err) { fail(res, err); }
});

/* ─── Phase 3: Decision Replay ───────────────────────────────────────────── */

router.get("/replay/matches", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ q: z.string().max(80).optional(), limit: z.coerce.number().int().min(1).max(100).default(40) }).safeParse(req.query);
  if (!parsed.success) return bad(res, parsed.error.issues);
  res.json({ matches: listReplayMatches(parsed.data.q, parsed.data.limit) });
});

router.get("/replay/:matchId", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const r = buildReplay(String(req.params.matchId));
  if (!r) { res.status(404).json({ error: "no_chase", detail: "Replays need a match with a completed second innings." }); return; }
  res.json(r);
});

/* ─── Phase 3: Opposition Exploit Map ────────────────────────────────────── */

router.get("/opposition", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({
    team: z.string().min(1), opponent: z.string().min(1), venue: z.string().optional(), season: yearSchema.optional(),
    sims: z.coerce.number().int().min(200).max(4000).optional(),
  }).safeParse(req.query);
  if (!parsed.success) return bad(res, parsed.error.issues);
  try { res.json(buildOppositionMap(parsed.data)); } catch (err) { fail(res, err); }
});

/* ─── Phase 4: Player Pool Graph ─────────────────────────────────────────── */

router.get("/pool/:id", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ side: z.enum(["batting", "bowling"]).optional(), window: z.enum(["career", "recent"]).default("career") }).safeParse(req.query);
  if (!parsed.success) return bad(res, parsed.error.issues);
  const id = resolvePlayerId(String(req.params.id));
  if (id === null) { res.status(404).json({ error: "player_not_found" }); return; }
  const g = poolGraph(id, parsed.data.side, parsed.data.window);
  if (!g) { res.status(404).json({ error: "not_qualified", detail: parsed.data.window === "recent" ? "Needs 150 balls faced or 120 bowled in the last three seasons." : "Needs 300 balls faced or 240 bowled in the IPL." }); return; }
  res.json(g);
});

/* ─── Phase 4: Squad DNA ─────────────────────────────────────────────────── */

router.get("/squad-dna/teams", (_req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  res.json({ teams: squadTeams() });
});

router.get("/squad-dna/profile", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ team: z.string().min(1), season: z.coerce.number().int().optional() }).safeParse(req.query);
  if (!parsed.success) return bad(res, parsed.error.issues);
  const p = squadProfile(parsed.data.team, parsed.data.season);
  if (!p) { res.status(404).json({ error: "team_season_not_found" }); return; }
  res.json(p);
});

router.get("/squad-dna/compare", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ a: z.string().min(1), aSeason: z.coerce.number().int().optional(), b: z.string().min(1), bSeason: z.coerce.number().int().optional() }).safeParse(req.query);
  if (!parsed.success) return bad(res, parsed.error.issues);
  const r = compareSquads({ team: parsed.data.a, season: parsed.data.aSeason }, { team: parsed.data.b, season: parsed.data.bSeason });
  if (!r) { res.status(404).json({ error: "team_season_not_found" }); return; }
  res.json(r);
});

/* ─── Phase 4: Auction War Room ──────────────────────────────────────────── */

const boardSchema = z.object({
  view: z.enum(["backtest", "live"]).default("live"),
  team: z.string().optional(),
  role: z.enum(["Batter", "Bowler", "All-rounder", "Wicketkeeper"]).optional(),
  overseas: z.enum(["only", "exclude"]).optional(),
  maxPrice: z.coerce.number().int().min(20).max(5000).optional(),
  signal: z.enum(["BUY", "HOLD", "AVOID", "SCOUT"]).optional(),
  q: z.string().max(60).optional(),
  sort: z.enum(["edge", "fit", "market", "impact"]).optional(),
});

router.get("/war-room/board", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = boardSchema.safeParse(req.query);
  if (!parsed.success) return bad(res, parsed.error.issues);
  if (parsed.data.team && !resolveFranchise(parsed.data.team)) { res.status(404).json({ error: "unknown_team" }); return; }
  res.json(auctionBoard(parsed.data));
});

router.get("/war-room/player/:key", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ view: z.enum(["backtest", "live"]).default("live") }).safeParse(req.query);
  if (!parsed.success) return bad(res, parsed.error.issues);
  const key = String(req.params.key);
  const id = /^(list:|p:)/.test(key) ? null : resolvePlayerId(key);
  const d = auctionPlayer(id !== null ? String(id) : key, parsed.data.view);
  if (!d) { res.status(404).json({ error: "player_not_in_board" }); return; }
  res.json(d);
});

/* ─── Page intel ─────────────────────────────────────────────────────────── */

router.get("/intel/player/:key", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const id = resolvePlayerId(String(req.params.key));
  if (id === null) { res.status(404).json({ error: "player_not_found" }); return; }
  const meta = getPlayerMeta().get(id)!;
  // A side is shown only when it is a real part of the player's game (Kohli's
  // 40-odd overs of part-time bowling would otherwise get a full column).
  const lines = getSeasonLines().get(id) ?? [];
  const batBalls = lines.reduce((s, l) => s + l.batBalls, 0), bowlBalls = lines.reduce((s, l) => s + l.bowlBalls, 0);
  const real = (s: "batting" | "bowling") => {
    const mine = s === "batting" ? batBalls : bowlBalls, other = s === "batting" ? bowlBalls : batBalls;
    return mine >= 600 || mine >= 0.25 * other;
  };
  const side = (s: "batting" | "bowling") => {
    if (!real(s)) return null;
    const gRaw = getPressureGenome(id, "career", s);
    const wRaw = scanPlayer(id, "recent", s);
    const poolRaw = poolGraph(id, s, "career");
    // Each service falls back to the player's other side; only keep answers for this side.
    const g = gRaw?.side === s && gRaw.qualified ? gRaw : null;
    const w = wRaw?.side === s ? wRaw : null;
    const pool = poolRaw?.side === s ? poolRaw : null;
    const anomaly = (a: { dimensions: string[]; headline: string; confidence: number } | undefined) => (a ? { label: a.dimensions.join(" · "), headline: a.headline, confidence: a.confidence } : null);
    const out = {
      pressure: g ? { index: g.pressureIndex, archetype: g.archetype, balls: g.pressureBalls, liftPer100: g.liftPer100 } : null,
      weakness: anomaly(w?.weaknesses[0]),
      strength: anomaly(w?.strengths[0]),
      pool: pool ? { archetype: pool.center.archetype, neighbours: pool.neighbours.slice(0, 4).map((n) => ({ playerId: n.playerId, name: n.name, similarity: n.similarity, archetype: n.archetype })) } : null,
    };
    return out.pressure || out.weakness || out.strength || out.pool ? out : null;
  };
  res.json({
    playerId: id, name: meta.name,
    batting: side("batting"), bowling: side("bowling"),
    auction: auctionIntel(id),
  });
});

router.get("/intel/team/:key", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const parsed = z.object({ season: z.coerce.number().int().optional() }).safeParse(req.query);
  if (!parsed.success) return bad(res, parsed.error.issues);
  const fr = resolveFranchise(String(req.params.key).replace(/-/g, " "));
  if (!fr) { res.status(404).json({ error: "unknown_team" }); return; }
  const p = squadProfile(fr.short, parsed.data.season);
  if (!p) { res.status(404).json({ error: "team_season_not_found" }); return; }
  res.json({
    short: p.short, franchise: p.franchise, season: p.season, matches: p.matches,
    fingerprint: p.fingerprint, vulnerability: p.vulnerability, strengths: p.strengths, twins: p.twins.slice(0, 3),
    seasons: squadTeams().find((t) => t.short === p.short)?.seasons ?? [],
  });
});

router.get("/intel/venue/:key", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const v = resolveVenue(String(req.params.key));
  if (!v) { res.status(404).json({ error: "venue_not_found" }); return; }
  const season = latest();
  const recent = profileVenue(v.venueIds, season);
  const allTime = profileVenue(v.venueIds, season, 100);
  res.json({ key: v.key, name: v.name, city: v.city, season, recent, allTime });
});

router.get("/intel/match/:id", (req: Request, res: Response): void => {
  if (!requireWarehouse(res)) return;
  const matchId = String(req.params.id);
  const c = getBallColumns();
  const mi = c.matchIndex.get(matchId);
  if (mi === undefined) { res.status(404).json({ error: "match_not_found" }); return; }
  const m = c.matches[mi];
  const cv = chaseCurve(matchId);
  // Turning points: the five balls that moved the chase win probability most.
  const turning = cv
    ? cv.curve.slice(1).map((p, i) => ({ ...p, swing: Math.round((p.winProb - cv.curve[i].winProb) * 10) / 10 }))
      .filter((p) => p.ball !== "end")
      .sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing)).slice(0, 5).sort((a, b) => a.legal - b.legal)
    : [];
  res.json({
    match: summarizeMatch(m),
    chasing: cv ? teamShort(cv.chasing) : null,
    defending: cv ? teamShort(cv.bowling) : null,
    target: cv?.target ?? null,
    curve: cv?.curve ?? [],
    turningPoints: turning,
    replayable: Boolean(cv && m.winner !== null),
  });
});

export default router;
