import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { auctionSimulateBody, squadSimulateBody, TEAMS } from "../services/intelligence/schema";
import {
  citation, comparePlayers, diagnostics, fitEnvelope, getSnapshot, insights, leagueTeams, listPlayers, marketEnvelope, modelStatus, playerIntelligence,
  replacementOptions, resolve, retentionEnvelope, setDeskReader, simulateAuction, simulateSquad, soldEnvelope, teamReport, valueAssessment,
} from "../services/intelligence/service";
import { getAuctionDeskSnapshot } from "./auction-2027";
import { rateLimit } from "../lib/rate-limit";

// Player Intelligence API. Every value here comes from the published snapshot in
// services/intelligence/service.ts, the same source the pages and the AI Analyst read.
//
//   GET  /api/intelligence/players[?role&team&q&overseas&minMatches&minLakh&maxLakh&verdict&fitTeam&sort&phase&discipline&limit]
//   GET  /api/intelligence/players/:key            full record (:key = canonical id, warehouse id or an exact name)
//   GET  /api/intelligence/players/:key/valuation | retention | franchise-fit | comparables
//   GET  /api/intelligence/players/:key/replacements?team=  ·  /citation[?version=]
//   GET  /api/intelligence/compare?a=&b=[&team=]
//   GET  /api/intelligence/teams  ·  /api/intelligence/teams/:team
//   POST /api/intelligence/squad/simulate  ·  /api/intelligence/auction/simulate
//   GET  /api/intelligence/models/status[?version=]  ·  /api/intelligence/diagnostics  ·  /api/intelligence/insights

setDeskReader(() => getAuctionDeskSnapshot());

const router: IRouter = Router();
const team = z.enum(TEAMS);

const ready = (res: Response) => {
  if (getSnapshot()) return true;
  res.status(503).json({ error: "intelligence_unavailable", message: "No intelligence snapshot has been published." });
  return false;
};

/** Resolves the route's player; replies itself for ambiguous, unknown or out-of-pool names. */
function target(req: Request, res: Response) {
  if (!ready(res)) return null;
  const { lookup, player } = resolve(String(req.params.key));
  if (lookup.status === "ambiguous") { res.status(409).json({ error: "ambiguous_identity", candidates: lookup.candidates }); return null; }
  if (!lookup.player) { res.status(404).json({ error: "player_not_found" }); return null; }
  if (!player) { res.status(404).json({ error: "prediction_unavailable", canonicalId: lookup.player.canonicalId, name: lookup.player.name, reason: "Outside the current player pool." }); return null; }
  return player;
}

const bad = (res: Response, issues: z.ZodIssue[]) => { res.status(400).json({ error: "invalid_request", issues: issues.map((i) => ({ path: i.path.join("."), message: i.message })) }); };

const listSchema = z.object({
  role: z.enum(["batter", "bowler", "all-rounder", "wicketkeeper"]).optional(),
  team: team.optional(), fitTeam: team.optional(), q: z.string().trim().max(60).optional(),
  overseas: z.enum(["only", "exclude"]).optional(),
  minMatches: z.coerce.number().int().min(0).max(400).optional(),
  minLakh: z.coerce.number().int().min(0).max(10_000).optional(),
  maxLakh: z.coerce.number().int().min(0).max(10_000).optional(),
  verdict: z.enum(["Undervalued", "Fairly priced", "Overvalued", "Not assessed"]).optional(),
  sort: z.enum(["impact", "price", "value", "fit"]).optional(),
  phase: z.enum(["powerplay", "middle", "death"]).optional(),
  discipline: z.enum(["batting", "bowling"]).optional(),
  limit: z.coerce.number().int().min(1).max(400).optional(),
}).strict();

router.get("/intelligence/players", (req, res) => {
  if (!ready(res)) return;
  const q = listSchema.safeParse(req.query);
  if (!q.success) return bad(res, q.error.issues);
  res.json(listPlayers(q.data));
});

router.get("/intelligence/players/:key", (req, res) => {
  if (!ready(res)) return;
  const d = playerIntelligence(String(req.params.key));
  if ("error" in d) {
    if (d.error === "ambiguous") res.status(409).json({ error: "ambiguous_identity", candidates: d.candidates });
    else res.status(d.error === "not_found" ? 404 : 503).json({ error: d.error === "not_found" ? "player_not_found" : "intelligence_unavailable" });
    return;
  }
  res.json(d);
});

router.get("/intelligence/players/:key/valuation", (req, res) => {
  const p = target(req, res);
  if (!p) return;
  const s = getSnapshot()!;
  res.json({ market: marketEnvelope(s, p), soldLikelihood: soldEnvelope(s, p), value: valueAssessment(p), history: p.history });
});
router.get("/intelligence/players/:key/retention", (req, res) => {
  const p = target(req, res);
  if (p) res.json(retentionEnvelope(getSnapshot()!, p));
});
router.get("/intelligence/players/:key/franchise-fit", (req, res) => {
  const p = target(req, res);
  if (p) res.json(fitEnvelope(getSnapshot()!, p));
});
router.get("/intelligence/players/:key/comparables", (req, res) => {
  const p = target(req, res);
  if (p) res.json({ canonicalId: p.id, modelVersion: getSnapshot()!.version, comparables: p.comparables });
});
router.get("/intelligence/players/:key/replacements", (req, res) => {
  const p = target(req, res);
  if (!p) return;
  const q = z.object({ team: team.optional() }).safeParse(req.query);
  if (!q.success) return bad(res, q.error.issues);
  const t = q.data.team ?? (TEAMS as readonly string[]).find((x) => x === p.team);
  if (!t) { res.status(400).json({ error: "team_required" }); return; }
  res.json(replacementOptions(p.id, t as (typeof TEAMS)[number]));
});

router.get("/intelligence/players/:key/citation", (req, res) => {
  if (!ready(res)) return;
  const q = z.object({ version: z.string().regex(/^cf-intel-[0-9a-z.]+$/).optional() }).strict().safeParse(req.query);
  if (!q.success) return bad(res, q.error.issues);
  const c = citation(String(req.params.key), q.data.version);
  if (!c) { res.status(404).json({ error: "citation_unavailable" }); return; }
  res.json(c);
});

router.get("/intelligence/compare", (req, res) => {
  if (!ready(res)) return;
  const q = z.object({ a: z.string().trim().min(1).max(80), b: z.string().trim().min(1).max(80), team: team.optional() }).strict().safeParse(req.query);
  if (!q.success) return bad(res, q.error.issues);
  const r = comparePlayers(q.data.a, q.data.b, q.data.team);
  res.status("error" in r ? 400 : 200).json(r);
});

router.get("/intelligence/teams", (_req, res) => { if (ready(res)) res.json(leagueTeams()); });
router.get("/intelligence/teams/:team", (req, res) => {
  if (!ready(res)) return;
  const t = team.safeParse(String(req.params.team).toUpperCase());
  if (!t.success) { res.status(404).json({ error: "unknown_team" }); return; }
  res.json(teamReport(t.data));
});

// Each scenario solves one integer program per step, so the two POST routes are rate limited.
router.post("/intelligence/squad/simulate", rateLimit({ name: "intel-squad", max: 40, windowMs: 60_000 }), (req, res) => {
  if (!ready(res)) return;
  const b = squadSimulateBody.safeParse(req.body ?? {});
  if (!b.success) return bad(res, b.error.issues);
  const r = simulateSquad(b.data.team, b.data.moves);
  res.status("error" in r ? 400 : 200).json(r);
});
router.post("/intelligence/auction/simulate", rateLimit({ name: "intel-auction", max: 40, windowMs: 60_000 }), (req, res) => {
  if (!ready(res)) return;
  const b = auctionSimulateBody.safeParse(req.body ?? {});
  if (!b.success) return bad(res, b.error.issues);
  const r = simulateAuction(b.data.team, b.data.players, b.data.purseLakh);
  res.status("error" in r ? 400 : 200).json(r);
});

router.get("/intelligence/models/status", (req, res) => {
  const q = z.object({ version: z.string().regex(/^cf-intel-[0-9a-z.]+$/).optional() }).strict().safeParse(req.query);
  if (!q.success) return bad(res, q.error.issues);
  const s = modelStatus(q.data.version);
  if (!s) { res.status(404).json({ error: "version_not_found" }); return; }
  res.json(s);
});
router.get("/intelligence/diagnostics", (_req, res) => { if (ready(res)) res.json(diagnostics()); });
router.get("/intelligence/insights", (_req, res) => { if (ready(res)) res.json(insights()); });

export default router;
