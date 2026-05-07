import { Router, type IRouter } from "express";
import { getCricbuzzMatches, getIplMatches, getEspnNews, isValidNewsCategory } from "../services/cricbuzz";

const router: IRouter = Router();

router.get("/live/matches", async (req, res) => {
  try {
    const matches = await getCricbuzzMatches();
    res.json({ count: matches.length, matches, fetchedAt: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch live matches");
    res.status(502).json({ error: "live_source_unavailable" });
  }
});

router.get("/live/ipl/matches", async (req, res) => {
  try {
    const matches = await getIplMatches();
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
    const news = await getEspnNews(category);
    res.json({ count: news.length, items: news, fetchedAt: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch live news");
    res.status(502).json({ error: "news_source_unavailable" });
  }
});

export default router;
