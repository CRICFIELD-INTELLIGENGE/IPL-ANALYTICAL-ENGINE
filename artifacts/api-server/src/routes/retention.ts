import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { requireAdmin } from "../lib/admin-auth";
import { rateLimit } from "../lib/rate-limit";
import { TEAMS } from "../services/intelligence/schema";
import { verifiedUser } from "../services/platform/auth";
import {
  editorialOpinion, editorialOverride, fanResults, franchiseRoom, freezeSeason, getFreeze, history, leagueSummary, myBallot, myBallots, playerRetention,
  seasons, simulate, submitBallot, teamDilemmas, teamForecast, teamPicks, tradeIntelligence, validateBallot,
} from "../services/retention/service";
import { CATEGORIES } from "../services/retention/crr";
import { entrySchema, upsertEntry } from "../services/retention/ledger";

// CRICFIELD Retention Room API. Picks, Forecast and Fan Picks are separate outputs and
// keep separate routes. Ballots need a verified account; editorial writes and freezes
// need the admin token. No route returns a voter's identity.
//
//   GET  /api/retention/seasons  ·  /api/retention/summary  ·  /api/retention/history
//   GET  /api/retention/:season/franchises/:team[/picks|/forecast|/fan-results|/dilemmas]
//   GET  /api/retention/:season/players/:key
//   POST /api/retention/simulate
//   GET  /api/retention/ballots/mine[?season&team]   POST /api/retention/ballots   POST /api/retention/ballots/check
//   POST /api/retention/:season/freeze  ·  /api/retention/:season/editorial  (admin)
//   GET  /api/retention/freezes/:id
//   GET  /api/retention/trades[?team]   POST /api/retention/trades  (admin; squads change at the next publish)

const router: IRouter = Router();
const team = z.enum(TEAMS);
const season = z.coerce.number().int().min(2008).max(2100);
const choices = z.record(z.string().min(3).max(120), z.enum(["retain", "release"])).refine((c) => Object.keys(c).length <= 40, "too many players");
const bad = (res: Response, issues: z.ZodIssue[]) => { res.status(400).json({ error: "invalid_request", issues: issues.map((i) => ({ path: i.path.join("."), message: i.message })) }); };

function scope(req: Request, res: Response) {
  const p = z.object({ season, team }).safeParse({ season: req.params.season, team: String(req.params.team).toUpperCase() });
  if (!p.success) { res.status(404).json({ error: "unknown_season_or_team" }); return null; }
  return p.data;
}
const respond = (res: Response, body: unknown) => {
  if (body === null) { res.status(404).json({ error: "season_not_live", message: "Retention Room data exists for the live season only. Past seasons are under history." }); return; }
  res.json(body);
};

router.get("/retention/seasons", (_req, res) => { res.json(seasons()); });
router.get("/retention/summary", (_req, res) => respond(res, leagueSummary()));
router.get("/retention/history", (_req, res) => { res.json(history()); });
router.get("/retention/freezes/:id", (req, res) => {
  const f = /^[0-9a-f-]{36}$/.test(String(req.params.id)) ? getFreeze(String(req.params.id)) : null;
  if (!f) { res.status(404).json({ error: "freeze_not_found" }); return; }
  res.json(f);
});

router.get("/retention/trades", (req, res) => {
  const t = req.query.team ? team.safeParse(String(req.query.team).toUpperCase()) : null;
  if (t && !t.success) { res.status(404).json({ error: "unknown_team" }); return; }
  res.json(tradeIntelligence(t?.data));
});
router.post("/retention/trades", requireAdmin, (req, res) => {
  const b = entrySchema.safeParse(req.body ?? {});
  if (!b.success) return bad(res, b.error.issues);
  res.status(201).json({ entry: upsertEntry(b.data), note: "Squads change only for Completed or Officially Confirmed entries, at the next model publish." });
});

router.get("/retention/:season/franchises/:team", (req, res) => { const s = scope(req, res); if (s) respond(res, franchiseRoom(s.season, s.team)); });
router.get("/retention/:season/franchises/:team/picks", (req, res) => { const s = scope(req, res); if (s) respond(res, teamPicks(s.season, s.team)); });
router.get("/retention/:season/franchises/:team/intelligence", (req, res) => {
  const s = scope(req, res);
  if (!s) return;
  const picks = teamPicks(s.season, s.team);
  if (!picks) return respond(res, null);
  res.json({
    season: s.season,
    team: s.team,
    planning: picks.planning,
    method: picks.method,
    evidenceCoverage: picks.evidenceCoverage,
    players: picks.rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      category: r.category,
      contractLakh: r.contractLakh,
      editorial: r.editorial,
      financial: r.financial,
    }))
  });
});
router.get("/retention/:season/franchises/:team/forecast", (req, res) => { const s = scope(req, res); if (s) respond(res, teamForecast(s.season, s.team)); });
router.get("/retention/:season/franchises/:team/fan-results", (req, res) => { const s = scope(req, res); if (s) respond(res, fanResults(s.season, s.team)); });
router.get("/retention/:season/franchises/:team/dilemmas", (req, res) => { const s = scope(req, res); if (s) respond(res, teamDilemmas(s.season, s.team) === null ? null : { dilemmas: teamDilemmas(s.season, s.team) }); });
router.get("/retention/:season/players/:key", (req, res) => {
  const d = playerRetention(String(req.params.key));
  if (!d) { res.status(404).json({ error: "no_retention_record" }); return; }
  res.json(d);
});

const simulateBody = z.object({ season, team, choices: choices.optional() }).strict();
router.post("/retention/simulate", rateLimit({ name: "retention-sim", max: 30, windowMs: 60_000 }), (req, res) => {
  const b = simulateBody.safeParse(req.body ?? {});
  if (!b.success) return bad(res, b.error.issues);
  respond(res, simulate(b.data.season, b.data.team, b.data.choices));
});

const ballotBody = z.object({ season, team, choices }).strict();

router.post("/retention/ballots/check", rateLimit({ name: "retention-check", max: 60, windowMs: 60_000 }), (req, res) => {
  const b = ballotBody.safeParse(req.body ?? {});
  if (!b.success) return bad(res, b.error.issues);
  res.json(validateBallot(b.data.season, b.data.team, b.data.choices));
});

router.get("/retention/ballots/mine", async (req, res) => {
  const user = await verifiedUser(req);
  if (!user) { res.status(401).json({ error: "sign_in_required" }); return; }
  const q = z.object({ season: season.optional(), team: team.optional() }).strict().safeParse(req.query);
  if (!q.success) return bad(res, q.error.issues);
  if (q.data.season && q.data.team) { res.json({ ballot: myBallot(user.id, q.data.season, q.data.team) }); return; }
  res.json(myBallots(user.id));
});

router.post("/retention/ballots", rateLimit({ name: "retention-ballot", max: 20, windowMs: 60_000 }), async (req, res) => {
  const user = await verifiedUser(req);
  if (!user) { res.status(401).json({ error: "sign_in_required" }); return; }
  const b = ballotBody.safeParse(req.body ?? {});
  if (!b.success) return bad(res, b.error.issues);
  const r = submitBallot(user.id, b.data.season, b.data.team, b.data.choices);
  if (r.ok) { res.status(201).json({ saved: true, updatedAt: new Date(r.ballot.updatedAt).toISOString(), notes: r.notes }); return; }
  if (r.code === "locked") { res.status(409).json({ error: "voting_locked", message: "Voting has closed for this cycle." }); return; }
  if (r.code === "season_closed") { res.status(404).json({ error: "season_not_live" }); return; }
  res.status(422).json({ error: r.code, violations: r.violations, notes: r.notes });
});

router.post("/retention/:season/freeze", requireAdmin, (req, res) => {
  const s = season.safeParse(req.params.season);
  const b = z.object({ reason: z.string().trim().min(5).max(200) }).strict().safeParse(req.body ?? {});
  if (!s.success || !b.success) { res.status(400).json({ error: "invalid_request" }); return; }
  const row = freezeSeason(s.data, b.data.reason);
  if (!row) { res.status(404).json({ error: "season_not_live" }); return; }
  res.status(201).json(row);
});

const editorialBody = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("override"), team, player: z.string().min(2).max(120), category: z.enum(CATEGORIES.filter((c) => c !== "Insufficient Evidence") as [string, ...string[]]), rationale: z.string().trim().min(40).max(1200) }).strict(),
  z.object({ kind: z.literal("dilemma"), team, dilemmaId: z.string().min(5).max(160), opinion: z.string().trim().min(40).max(1200) }).strict(),
]);
router.post("/retention/:season/editorial", requireAdmin, (req, res) => {
  const s = season.safeParse(req.params.season);
  const b = editorialBody.safeParse(req.body ?? {});
  if (!s.success) { res.status(400).json({ error: "invalid_request" }); return; }
  if (!b.success) return bad(res, b.error.issues);
  const out = b.data.kind === "override" ? editorialOverride(s.data, b.data.team, b.data.player, b.data.category, b.data.rationale) : editorialOpinion(s.data, b.data.team, b.data.dilemmaId, b.data.opinion);
  if (!out) { res.status(404).json({ error: "subject_not_found" }); return; }
  res.status(201).json(out);
});

export default router;
