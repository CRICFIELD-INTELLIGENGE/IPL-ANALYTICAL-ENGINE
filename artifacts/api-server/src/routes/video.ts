// CricField Video Intelligence API Routes (/api/video/*)
//
// Endpoints:
//   GET  /api/video/catalogue    â€” Search and filter official video catalogue
//   GET  /api/video/match/:id    â€” Resolved official videos for a CricField match
//   GET  /api/video/player/:id   â€” Resolved official videos for a player
//   GET  /api/video/stats        â€” Catalogue verification statistics and entity resolution rate
//   POST /api/video/refresh      â€” Metadata refresh endpoint

import { Router, type Request, type Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { syncHotstarIPLClips } from "../services/video/hotstar-clip-sync";
import { z } from "zod";
import { getProjectRoot } from "../services/scout/db";
import { requireAdmin } from "../lib/admin-auth";
import { rateLimit } from "../lib/rate-limit";
import {
  searchVideoCatalogue,
  getVideosForMatch,
  getVideosForPlayer,
  getVideoStatsSummary,
  getUnifiedVideoCatalogue,
  type VideoProvider,
} from "../services/video/video-intelligence-service";

const router = Router();
router.use((req, res, next) => req.method === "GET" || req.method === "HEAD" ? next() : requireAdmin(req, res, next));
router.use(["/sync-hotstar", "/add-clip"], rateLimit({ name: "video-maintenance", max: 5, windowMs: 60_000 }));

const hotstarUrl = z.string().url().max(2048).refine((value) => {
  const u = new URL(value);
  return u.protocol === "https:" && !u.username && !u.password && !u.port &&
    ["www.hotstar.com", "hotstar.com", "www.jiohotstar.com", "jiohotstar.com"].includes(u.hostname);
}, "Use an official HTTPS Hotstar video URL");
const syncSchema = z.object({ teamTag: z.string().regex(/^[A-Za-z0-9 -]{1,50}$/).default("SRH"), limit: z.coerce.number().int().min(1).max(25).default(10) }).strict();
const clipSchema = z.object({
  url: hotstarUrl, team: z.string().regex(/^[A-Za-z0-9 -]{1,50}$/).default("SRH"),
  title: z.string().trim().min(1).max(200).optional(),
  thumbnailUrl: z.string().url().max(2048).refine(u => new URL(u).protocol === "https:").optional(),
  duration: z.string().regex(/^\d{1,3}:\d{2}$/).default("01:30"),
}).strict();

const catalogueQuerySchema = z.object({
  query: z.string().max(100).optional(),
  competition: z.string().max(30).optional(),
  season: z.coerce.number().int().min(2008).max(2030).optional(),
  team: z.string().max(50).optional(),
  player: z.string().max(80).optional(),
  category: z.string().max(50).optional(),
  provider: z.enum(["jiohotstar", "youtube", "official_bcci"]).optional(),
  matchId: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get("/catalogue", (req: Request, res: Response): void => {
  const parsed = catalogueQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query_parameters", issues: parsed.error.issues });
    return;
  }

  const results = searchVideoCatalogue(parsed.data as any);
  res.json(results);
});

router.get("/match/:matchId", (req: Request, res: Response): void => {
  const matchId = String(req.params.matchId).trim();
  if (!matchId) {
    res.status(400).json({ error: "match_id_required" });
    return;
  }

  const videos = getVideosForMatch(matchId);
  res.json({
    matchId,
    count: videos.length,
    videos,
  });
});

router.get("/player/:playerId", (req: Request, res: Response): void => {
  const playerId = String(req.params.playerId).trim();
  if (!playerId) {
    res.status(400).json({ error: "player_id_required" });
    return;
  }

  const videos = getVideosForPlayer(playerId);
  res.json({
    playerId,
    count: videos.length,
    videos,
  });
});

router.get("/stats", (_req: Request, res: Response): void => {
  const stats = getVideoStatsSummary();
  res.json(stats);
});

router.post("/refresh", (_req: Request, res: Response): void => {
  // Clear and reload
  const catalogue = getUnifiedVideoCatalogue();
  res.json({
    refreshed: true,
    totalIndexed: catalogue.length,
    timestamp: new Date().toISOString(),
  });
});

router.post("/sync-hotstar", async (req: Request, res: Response): Promise<void> => {
  const parsed = syncSchema.safeParse(req.body ?? {});
  if (!parsed.success) { res.status(400).json({ error: "invalid_request" }); return; }
  const { teamTag, limit } = parsed.data;
  const apiKey = process.env.ANAKIN_API_KEY;
  if (!apiKey) { res.status(503).json({ error: "provider_unavailable" }); return; }

  const cataloguePath = path.join(getProjectRoot(), "artifacts/api-server/src/data/video-catalogue.json");

  try {
    const { syncedCount, clips } = await syncHotstarIPLClips({
      teamTag,
      limit,
      apiKey,
      existingCatalogPath: cataloguePath,
    });

    if (syncedCount > 0) {
      try {
        const raw = await fs.readFile(cataloguePath, "utf-8");
        const currentList = JSON.parse(raw);
        const merged = [...clips, ...currentList];
        await fs.writeFile(cataloguePath, JSON.stringify(merged, null, 2), "utf-8");

        // Sync to frontend if exists
        const frontendPath = path.join(getProjectRoot(), "artifacts/ipl-analytics/src/data/video-catalogue.json");
        await fs.writeFile(frontendPath, JSON.stringify(merged, null, 2), "utf-8").catch(() => {});
      } catch (err) {
        console.warn("[video.ts] Warning writing catalogue:", err);
      }
    }

    res.json({
      success: true,
      teamTag,
      newClipsCount: syncedCount,
      clips,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "video_sync_failed",
    });
  }
});

router.post("/add-clip", async (req: Request, res: Response): Promise<void> => {
  const parsed = clipSchema.safeParse(req.body ?? {});
  if (!parsed.success) { res.status(400).json({ error: "invalid_request" }); return; }
  const { url, team, title, thumbnailUrl, duration } = parsed.data;

  try {
    const parsedUrl = new URL(url);
    const parts = parsedUrl.pathname.split("/").filter(Boolean);
    const contentId = parts[parts.length - 1];

    let resolvedTitle = title;
    let resolvedThumb = thumbnailUrl;

    // If title or thumbnail is missing, attempt to scrape OpenGraph metadata (0 credits)
    if (!resolvedTitle || !resolvedThumb) {
      try {
        const scrapeRes = await fetch(url, {
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        });
        if (scrapeRes.ok) {
          const html = await scrapeRes.text();
          const ogTitle = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1];
          const ogImg = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];
          if (!resolvedTitle && ogTitle) resolvedTitle = ogTitle.replace(/\s*\|\s*Watch.*$/i, "").trim();
          if (!resolvedThumb && ogImg) resolvedThumb = ogImg;
        }
      } catch {
        // Fallback
      }
    }

    const newClip = {
      id: `HSTAR-${contentId}`,
      title: resolvedTitle || `IPL Highlights: ${team.toUpperCase()}`,
      videoType: "match_highlights",
      originalCategory: "Hotstar Cricket Highlights",
      season: 2026,
      teams: [team.toUpperCase()],
      players: [],
      opponent: null,
      duration,
      description: resolvedTitle || "Official match highlights clip",
      officialVideoUrl: url,
      destinationUrl: url,
      isExactVideoUrl: true,
      broadcaster: "JioHotstar" as const,
      verified: false,
      beyondXiCategory: "Match Coverage",
      suggestedDestination: "Dugout Video Vault",
      keywords: [team.toUpperCase(), "IPL", "Highlights", "Hotstar"],
      hotstarContentId: String(contentId),
      thumbnailUrl: resolvedThumb || `https://img10.hotstar.com/image/upload/f_auto,q_90,w_1280/sources/r1/cms/prod/sports/${contentId}`,
    };

    const cataloguePath = path.join(getProjectRoot(), "artifacts/api-server/src/data/video-catalogue.json");
    const raw = await fs.readFile(cataloguePath, "utf-8");
    const list = JSON.parse(raw);

    const existingIdx = list.findIndex(
      (v: any) => String(v.hotstarContentId) === String(contentId) || v.id === newClip.id
    );

    if (existingIdx !== -1) {
      list[existingIdx] = { ...list[existingIdx], ...newClip };
    } else {
      list.unshift(newClip);
    }

    await fs.writeFile(cataloguePath, JSON.stringify(list, null, 2), "utf-8");

    // Also sync to frontend
    const frontendPath = path.join(getProjectRoot(), "artifacts/ipl-analytics/src/data/video-catalogue.json");
    await fs.writeFile(frontendPath, JSON.stringify(list, null, 2), "utf-8").catch(() => {});

    res.json({
      success: true,
      action: existingIdx !== -1 ? "updated" : "created",
      clip: newClip,
    });
  } catch (err: any) {
    res.status(500).json({ error: "failed_adding_clip" });
  }
});

router.post("/webhooks/anakin", (req: Request, res: Response): void => {
  const payload = req.body;
  console.log(`[AnakinWebhook] Received status for job ${payload?.id}: ${payload?.status}`);
  res.status(200).json({ received: true, jobId: payload?.id, status: payload?.status });
});

export default router;
