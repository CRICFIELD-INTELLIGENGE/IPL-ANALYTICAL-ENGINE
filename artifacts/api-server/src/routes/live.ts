import { Router, type IRouter } from "express";
import { getCricbuzzMatches, getIplMatches, getEspnNews, isValidNewsCategory, getOrangeCap, getPurpleCap, getTrending, getWinProbability, getVenueInsights } from "../services/cricbuzz";
import { getAccurateMatchDetails } from "../services/onlineDb";
import { isWarehouseReady } from "../services/decision/player-profiles";
import { overWinProbability } from "../services/decision/decision-replay";

import { isAdminRequest } from "../lib/admin-auth";

const router: IRouter = Router();

router.get("/live/matches", async (req, res) => {
  try {
    // Cache bypass triggers fresh scraping of third-party sites, so only admins may force it.
    const bypassCache = (req.query.refresh === "true" || req.query.bypassCache === "true") && isAdminRequest(req);
    const matches = await getCricbuzzMatches(bypassCache);
    res.json({ count: matches.length, matches, fetchedAt: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch live matches");
    res.status(502).json({ error: "live_source_unavailable" });
  }
});

router.get("/live/ipl/matches", async (req, res) => {
  try {
    // Cache bypass triggers fresh scraping of third-party sites, so only admins may force it.
    const bypassCache = (req.query.refresh === "true" || req.query.bypassCache === "true") && isAdminRequest(req);
    const matches = await getIplMatches(bypassCache);
    res.json({ count: matches.length, matches, fetchedAt: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch IPL live matches");
    res.status(502).json({ error: "live_source_unavailable" });
  }
});

router.get("/live/news", async (req, res) => {
  try {
    const raw = typeof req.query.category === "string" ? req.query.category : "general";
    const category = isValidNewsCategory(raw) ? raw : "general";
    // Cache bypass triggers fresh scraping of third-party sites, so only admins may force it.
    const bypassCache = (req.query.refresh === "true" || req.query.bypassCache === "true") && isAdminRequest(req);
    const news = await getEspnNews(category, bypassCache);
    res.json({ count: news.length, items: news, fetchedAt: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch live news");
    res.status(502).json({ error: "news_source_unavailable" });
  }
});

router.get("/live/orange-cap", async (req, res) => {
  try {
    const data = await getOrangeCap();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "source_unavailable" });
  }
});

router.get("/live/purple-cap", async (req, res) => {
  try {
    const data = await getPurpleCap();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "source_unavailable" });
  }
});

router.get("/live/trending", async (req, res) => {
  try {
    const data = await getTrending();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "source_unavailable" });
  }
});

router.get("/live/win-probability/:matchId", async (req, res) => {
  try {
    // Archived matches: the calibrated chase model over the real ball-by-ball record.
    const archived = isWarehouseReady() ? overWinProbability(String(req.params.matchId)) : null;
    if (archived) {
      res.json(archived);
      return;
    }
    const data = await getWinProbability(Number(req.params.matchId));
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "source_unavailable" });
  }
});

router.get("/live/venue-insights/:venueId", async (req, res) => {
  try {
    const data = await getVenueInsights(Number(req.params.venueId));
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "source_unavailable" });
  }
});

router.get("/live/match-details/:matchId", async (req, res) => {
  try {
    const { team1, team2 } = req.query;
    const data = await getAccurateMatchDetails(
      req.params.matchId, 
      typeof team1 === 'string' ? team1 : 'Team 1', 
      typeof team2 === 'string' ? team2 : 'Team 2'
    );
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "source_unavailable" });
  }
});

export default router;
