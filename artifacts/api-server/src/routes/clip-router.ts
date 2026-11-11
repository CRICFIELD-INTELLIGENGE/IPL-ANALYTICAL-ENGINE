import { Router, type Request, type Response } from "express";
import videoData from "../data/video-catalogue.json";

export interface ClipCatalogItem {
  id: string;
  title: string;
  keywords: string[];
  url: string;
  teams?: string[];
  players?: string[];
  matchStage?: string | null;
  duration?: string;
  beyondXiCategory?: string;
}

export interface ClipRouteResult {
  matched: boolean;
  clip_id: string | null;
  title: string | null;
  url: string | null;
}

export const CLIP_CATALOG: ClipCatalogItem[] = (videoData as any[]).map((v) => ({
  id: v.id,
  title: v.title,
  keywords: v.keywords || [],
  url: v.destinationUrl,
  teams: v.teams,
  players: v.players,
  matchStage: v.matchStage,
  duration: v.duration,
  beyondXiCategory: v.beyondXiCategory,
}));

/**
 * The standard prompt template for LLM video navigation routing.
 */
export const VIDEO_ROUTER_PROMPT_TEMPLATE = `You are an intelligent video navigation router for a sports streaming platform. Your job is to match the user's intent to the single most relevant video from the catalog below and return ONLY valid JSON.

### INSTRUCTIONS:
1. Analyze the user's query for player names, teams, tournament stages (Final, Eliminator, Qualifier), shot types, or milestones.
2. Select the best matching clip from the catalog.
3. If no clip matches the request, set "matched" to false and "url" to null.
4. Output strictly raw JSON without markdown code fences, comments, or extra text.

### CATALOG:
${JSON.stringify(CLIP_CATALOG, null, 2)}

### EXPECTED OUTPUT FORMAT:
{
  "matched": true,
  "clip_id": "string",
  "title": "string",
  "url": "string"
}

### USER QUERY:
"{{USER_SEARCH_INPUT}}"`;

/**
 * Deterministic keyword & semantic fallback matcher when LLM API is unavailable.
 */
export function matchClipLocally(query: string): ClipRouteResult {
  if (!query || !query.trim()) {
    return { matched: false, clip_id: null, title: null, url: null };
  }

  const q = query.toLowerCase().replace(/[*'"]/g, "").trim();
  const qTokens = q.split(/\s+/).filter(Boolean);

  let bestClip: ClipCatalogItem | null = null;
  let bestScore = 0;

  for (const item of CLIP_CATALOG) {
    let score = 0;
    const titleLower = item.title.toLowerCase();

    // Check keyword hits
    for (const kw of item.keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += 3;
      }
    }

    // Check token overlaps with title
    for (const token of qTokens) {
      if (token.length > 2 && titleLower.includes(token)) {
        score += 2;
      }
    }

    // Exact milestone score boosts
    if (q.includes("75") && item.id.includes("75")) score += 5;
    if (q.includes("93") && item.id.includes("93")) score += 5;
    if (q.includes("104") && item.id.includes("104")) score += 5;
    if (q.includes("97") && item.id.includes("97")) score += 5;
    if ((q.includes("3/27") || q.includes("3-27") || q.includes("rasikh")) && item.id.includes("rasikh")) score += 5;
    if (q.includes("101") && item.id.includes("101")) score += 5;
    if (q.includes("final") && item.id.includes("final")) score += 2;
    if ((q.includes("q1") || q.includes("qualifier 1")) && item.id.includes("q1")) score += 5;
    if ((q.includes("q2") || q.includes("qualifier 2")) && item.id.includes("q2")) score += 5;
    if (q.includes("eliminator") && item.id.includes("eliminator")) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestClip = item;
    }
  }

  // Need at least 3 points of correlation to trigger a match
  if (bestClip && bestScore >= 3) {
    return {
      matched: true,
      clip_id: bestClip.id,
      title: bestClip.title,
      url: bestClip.url,
    };
  }

  return { matched: false, clip_id: null, title: null, url: null };
}

/**
 * Turn the model's JSON into a result using only catalogue data. The model may
 * only choose a clip id; the title and URL always come from CLIP_CATALOG, so a
 * hallucinated or injected URL can never reach the user.
 */
export function resolveModelClipChoice(parsed: unknown): ClipRouteResult {
  const p = (parsed ?? {}) as Record<string, unknown>;
  const id = typeof p["clip_id"] === "string" ? p["clip_id"] : typeof p["clipId"] === "string" ? p["clipId"] : null;
  const clip = p["matched"] && id ? CLIP_CATALOG.find((c) => c.id === id) : undefined;
  if (!clip) return { matched: false, clip_id: null, title: null, url: null };
  return { matched: true, clip_id: clip.id, title: clip.title, url: clip.url };
}

/**
 * Route a user query using Gemini LLM if key is present, with automatic fallback.
 */
export async function routeClipWithLLM(userInput: string): Promise<ClipRouteResult> {
  const apiKey = process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"] || "";

  if (!apiKey || apiKey.length < 5) {
    // No API key configured on server: use deterministic matching
    return matchClipLocally(userInput);
  }

  try {
    const fullPrompt = VIDEO_ROUTER_PROMPT_TEMPLATE.replace(
      "{{USER_SEARCH_INPUT}}",
      userInput.replace(/"/g, '\\"')
    );

    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      return matchClipLocally(userInput);
    }

    const data = (await res.json()) as any;
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return matchClipLocally(userInput);
    }

    // Clean any accidental markdown fence if present
    const cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim();
    return resolveModelClipChoice(JSON.parse(cleaned));
  } catch (_err) {
    return matchClipLocally(userInput);
  }
}

const clipRouter = Router();

/**
 * POST /api/get-clip-route
 * Body: { query: string }
 */
clipRouter.post("/get-clip-route", async (req: Request, res: Response) => {
  const query = req.body?.query ?? req.query?.query;

  if (typeof query === "string" && query.length > 200) {
    res.status(400).json({ error: "invalid_request", detail: "query must be at most 200 characters" });
    return;
  }

  if (typeof query !== "string" || !query.trim()) {
    res.json({
      matched: false,
      clip_id: null,
      title: null,
      url: null,
    });
    return;
  }

  const result = await routeClipWithLLM(query.trim());
  res.json(result);
});

/**
 * GET /api/get-clip-catalog
 */
clipRouter.get("/get-clip-catalog", (_req: Request, res: Response) => {
  res.json({
    count: CLIP_CATALOG.length,
    catalog: CLIP_CATALOG,
  });
});

export default clipRouter;
