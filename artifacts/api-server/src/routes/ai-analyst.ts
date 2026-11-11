import { runScoutConversation } from "../services/scout-conversation";
import { aiConfig } from "../services/ai-provider";
import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "../lib/rate-limit";
import { runAnalyst, type AnalystTool } from "../services/cricfield-analyst";
import { parseQuestion } from "../services/decision/nl-parser";
import { runStatQuery } from "../services/decision/stats-engine";
import { getPlayerSummary, searchPlayers } from "../services/decision/player-summary";
import { getAuctionDeskSnapshot } from "./auction-2027";
import { fanResults, leagueSummary, liveRetentionSeason, teamDilemmas, teamForecast, teamPicks } from "../services/retention/service";
import { getSnapshot, listPlayers, playerIntelligence, replacementOptions, simulateSquad } from "../services/intelligence/service";

const router = Router();
let active = 0, calls = 0, day = "";
export async function executeAnalystTool(tool: AnalystTool) {
  if (tool.name === "auction_records") return { source: "/api/auction-2027", data: getAuctionDeskSnapshot() };
  if (tool.name === "player_summary") {
    const matches = searchPlayers(tool.args.player, 5);
    return { source: "/api/players/search", data: matches.length === 1 ? getPlayerSummary(matches[0].playerId) : { clarificationRequired: true, candidates: matches } };
  }
  if (tool.name === "player_valuation") {
    const d = playerIntelligence(tool.args.player);
    if ("error" in d) return { source: "/api/intelligence/players", data: d.error === "ambiguous" ? { clarificationRequired: true, candidates: d.candidates } : { unavailable: true, message: "No record for that player." } };
    return { source: `/api/intelligence/players/${d.identity.canonicalId}`, data: { name: d.identity.name, modelVersion: d.modelVersion, targetSeason: d.targetSeason, dataCutoff: d.dataCutoff, current: d.current, performance: d.performance, market: d.market, value: d.value, retention: d.retention, bestFits: d.franchise?.teams.slice(0, 3), comparables: d.comparables?.slice(0, 3), simulation: d.seasonSimulation } };
  }
  if (tool.name === "best_value") {
    const r = listPlayers({ sort: "value", role: tool.args.role, maxLakh: tool.args.maxLakh, verdict: "Undervalued", limit: 8 });
    return { source: "/api/intelligence/players?sort=value", data: r ?? { unavailable: true } };
  }
  if (tool.name === "franchise_need") {
    const s = getSnapshot();
    if (!s) return { source: "/api/intelligence/teams", data: { unavailable: true } };
    const teams = Object.values(s.teams).filter((t) => !tool.args.team || t.team === tool.args.team);
    const phase = tool.args.need === "death_bowler" ? "death" : tool.args.need === "powerplay_bowler" ? "powerplay" : undefined;
    const ranked = [...teams].sort((a, b) => (phase ? a.composition.phaseCoverage[phase] - b.composition.phaseCoverage[phase] : a.strength - b.strength)).slice(0, 5);
    const role = tool.args.need === "wicketkeeper" ? "wicketkeeper" : tool.args.need === "batter" ? "batter" : tool.args.need === "all_rounder" ? "all-rounder" : tool.args.need ? "bowler" : undefined;
    const targets = tool.args.team ? listPlayers({ fitTeam: tool.args.team, sort: "fit", role, limit: 6 }) : null;
    return { source: "/api/intelligence/teams", data: { modelVersion: s.version, targetSeason: s.targetSeason, teams: ranked.map((t) => ({ team: t.team, strength: t.strength, gaps: t.gaps, phaseCoverage: t.composition.phaseCoverage, spinners: t.composition.spinners, keepers: t.composition.keepers })), targets: targets?.rows, note: "Squads as of IPL 2026. Strength measures composition and has not been shown to predict results." } };
  }
  if (tool.name === "retention_picks") {
    const d = teamPicks(liveRetentionSeason(), tool.args.team);
    return { source: `/api/retention/${d?.season}/franchises/${tool.args.team}/picks`, data: d ? { season: d.season, modelVersion: d.modelVersion, indexVersion: d.indexVersion, dataCutoff: d.dataCutoff, note: d.method.note, rosterBasis: d.rosterBasis.label, players: d.rows.map((p) => ({ name: p.name, crr: p.index, coverage: p.coverage, confidence: p.confidence, category: p.category, role: p.granularRole, components: Object.fromEntries(p.metrics.map((m) => [m.key, m.fraction])), reason: p.reason, against: p.against, scenarios: p.scenarios.map((x) => ({ choice: x.label, runsPerMatchChange: x.rarChange, purseChangeLakh: x.purseChangeLakh, detail: x.detail })), editorial: p.editorial?.category ?? null })) } : { unavailable: true } };
  }
  if (tool.name === "retention_forecast") {
    const d = teamForecast(liveRetentionSeason(), tool.args.team);
    return { source: `/api/retention/${d?.season}/franchises/${tool.args.team}/forecast`, data: d ? { season: d.season, modelVersion: d.modelVersion, forecastStatus: d.forecastStatus, disclaimer: d.disclaimer, confirmed: d.rows.filter((r) => r.confirmed).map((r) => ({ name: r.name, ...r.confirmed })), forecasts: d.forecastStatus.available ? d.rows.map((r) => ({ name: r.name, probability: r.probability, category: r.category })) : [] } : { unavailable: true } };
  }
  if (tool.name === "retention_dilemmas") {
    if (tool.args.team) return { source: "/api/retention/dilemmas", data: { dilemmas: teamDilemmas(liveRetentionSeason(), tool.args.team) } };
    const d = leagueSummary();
    return { source: "/api/retention/summary", data: d ? { season: d.season, modelVersion: d.modelVersion, toughest: d.toughest, note: "Counts of players in the CRICFIELD Picks dilemma band." } : { unavailable: true } };
  }
  if (tool.name === "retention_fans") {
    const d = fanResults(liveRetentionSeason(), tool.args.team);
    return { source: `/api/retention/${d?.season}/franchises/${tool.args.team}/fan-results`, data: d ? { season: d.season, label: d.label, totalBallots: d.totalBallots, disagreements: d.disagreements, controversial: d.controversial, rankingsNote: d.rankingsNote } : { unavailable: true } };
  }
  if (tool.name === "squad_scenario") return { source: "/api/intelligence/squad/simulate", data: simulateSquad(tool.args.team, tool.args.moves) };
  if (tool.name === "replacement_options") return { source: "/api/intelligence/players/replacements", data: replacementOptions(tool.args.player, tool.args.team) };
  const parsed = parseQuestion(tool.args.question);
  if (!parsed.understood || !parsed.query) return { source: "/api/ask", data: { understood: false, notes: parsed.notes, message: "Unsupported question; request clarification." } };
  const query = { ...parsed.query, limit: Math.min(parsed.query.limit, 10) };
  return { source: "/api/ask", data: { query, notes: parsed.notes, result: runStatQuery(query) } };
}
router.post("/ai/analyst", rateLimit({ name: "ai-analyst", max: 5, windowMs: 60_000 }), async (req, res) => {
  const parsed = z.object({ prompt: z.string().trim().min(3).max(2000) }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "invalid_request" }); return; }
  const config = aiConfig();
  if (process.env.AI_ANALYST_ENABLED !== "true" || !config) { res.status(503).json({ error: "AI Analyst is not configured. Warehouse questions remain available." }); return; }
  const today = new Date().toISOString().slice(0,10);
  if (today !== day) { day = today; calls = 0; }
  const configured = Number(process.env.AI_ANALYST_DAILY_LIMIT ?? 100);
  const limit = Number.isInteger(configured) && configured > 0 ? configured : 100;
  if (active >= 2 || calls >= limit) { res.setHeader("Retry-After","60"); res.status(429).json({ error: "AI Analyst is busy or its daily allowance has been reached." }); return; }
  active++; calls++;
  try { res.json(await runAnalyst(parsed.data.prompt, { ...config, runTool: executeAnalystTool })); }
  catch { res.status(502).json({ error: "AI Analyst could not produce an evidence-backed answer. Try a specific player, season or comparison." }); }
  finally { active--; }
});
router.post("/scout/analyst", rateLimit({ name:"scout-analyst", max:5, windowMs:60_000 }), async (req,res) => {
 const input = z.object({ prompt:z.string().trim().min(3).max(1500), team:z.enum(["RCB","CSK","MI","KKR","SRH","RR","DC","PBKS","GT","LSG"]).optional(), history:z.array(z.object({ role:z.enum(["user","assistant"]),content:z.string().max(2000) }).strict()).max(6).default([]) }).strict().safeParse(req.body);
 if (!input.success) { res.status(400).json({error:"Please shorten your question or conversation."}); return; }
 const config=aiConfig();
 if(process.env.AI_ANALYST_ENABLED!=="true" || !config) {res.status(503).json({error:"Scout AI is not configured. Database player search is still available."});return;}
 const today=new Date().toISOString().slice(0,10);if(today!==day){day=today;calls=0;}
 const configured=Number(process.env.AI_ANALYST_DAILY_LIMIT ?? 100);const limit=Number.isInteger(configured)&&configured>0?configured:100;
 if(active>=2 || calls>=limit){res.status(429).json({error:"Scout AI is busy or its daily allowance has been reached. Try again later."});return;}
 active++;calls++;
 try {res.json(await runScoutConversation(input.data,config));}
 catch {res.status(502).json({error:"Scout AI could not complete this query. Try specifying a role, league and phase; no unverified answer was substituted."});}
 finally {active--;}
});
router.get("/scout/analyst/status", (_req,res) => {
 const config=aiConfig();res.json({enabled:process.env.AI_ANALYST_ENABLED==="true",modelConfigured:!!config,provider:config?.provider ?? null,webConfigured:process.env.SCOUT_WEB_SEARCH_ENABLED==="true"&&!!process.env.SERPAPI_API_KEY?.trim(),localModel:config?.provider==="ollama"});
});
export default router;
