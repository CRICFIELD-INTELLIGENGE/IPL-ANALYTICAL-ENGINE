import fs from "node:fs/promises";
import path from "node:path";

const ANAKIN_API_URL = "https://api.anakin.io/v1/wire";

export interface AnakinTaskResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "settled" | "failed";
  result?: any;
  error?: string;
}

export interface HotstarRawClip {
  content_id: string | number;
  title: string;
  title_slug: string;
  duration?: string | number;
  thumbnail?: string;
  description?: string;
}

export interface DugoutVaultVideo {
  id: string;
  title: string;
  videoType: string;
  originalCategory: string;
  season: number;
  teams: string[];
  players: string[];
  opponent?: string | null;
  matchStage?: string | null;
  duration?: string | null;
  description: string;
  officialVideoUrl: string;
  destinationUrl: string;
  isExactVideoUrl: boolean;
  broadcaster: "JioHotstar";
  verified: boolean;
  beyondXiCategory: string;
  suggestedDestination: string;
  keywords: string[];
  hotstarContentId: string;
  thumbnailUrl?: string | null;
}

/**
 * Submit an action to Anakin.io Wire and poll until finished or timed out
 */
export async function runAnakinAction<T = any>(
  actionId: string,
  params: Record<string, any>,
  options: {
    apiKey?: string;
    maxAttempts?: number;
    pollIntervalMs?: number;
    webhookUrl?: string;
  } = {}
): Promise<T> {
  const apiKey = options.apiKey || process.env.ANAKIN_API_KEY;
  if (!apiKey) {
    throw new Error("[HotstarSync] Missing ANAKIN_API_KEY in environment variables or request.");
  }

  const { maxAttempts = 20, pollIntervalMs = 2500, webhookUrl } = options;

  // 1. Submit asynchronous wire task
  const submitRes = await fetch(`${ANAKIN_API_URL}/task`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action_id: actionId,
      params,
      ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
    }),
  });

  if (!submitRes.ok) {
    const errorText = await submitRes.text();
    throw new Error(`[HotstarSync] Task submission failed (${submitRes.status}): ${errorText}`);
  }

  const job = (await submitRes.json()) as AnakinTaskResponse;

  // If webhookUrl was supplied, return pending job metadata
  if (webhookUrl) {
    return { jobId: job.id, status: job.status } as unknown as T;
  }

  // 2. Poll until task completes
  let attempts = 0;
  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    attempts++;

    const pollRes = await fetch(`${ANAKIN_API_URL}/jobs/${job.id}`, {
      headers: { "X-API-Key": apiKey },
    });

    if (!pollRes.ok) continue;

    const data = (await pollRes.json()) as AnakinTaskResponse;
    if (data.status === "completed" || data.status === "settled") {
      return data.result as T;
    }

    if (data.status === "failed") {
      throw new Error(`[HotstarSync] Anakin Job ${job.id} failed: ${data.error || "Unknown error"}`);
    }
  }

  throw new Error(`[HotstarSync] Timeout waiting for task ${job.id} after ${attempts} attempts`);
}

/**
 * Normalize franchise identifiers
 */
export function normalizeTeamCode(text: string): string[] {
  const t = text.toUpperCase();
  const matched: string[] = [];
  const map: Record<string, string> = {
    SRH: "SRH", HYDERABAD: "SRH",
    RCB: "RCB", BANGALORE: "RCB", BENGALURU: "RCB",
    CSK: "CSK", CHENNAI: "CSK",
    MI: "MI", MUMBAI: "MI",
    KKR: "KKR", KOLKATA: "KKR",
    GT: "GT", GUJARAT: "GT",
    RR: "RR", RAJASTHAN: "RR",
    DC: "DC", DELHI: "DC",
    PBKS: "PBKS", PUNJAB: "PBKS",
    LSG: "LSG", LUCKNOW: "LSG",
  };

  for (const [key, val] of Object.entries(map)) {
    if (t.includes(key) && !matched.includes(val)) {
      matched.push(val);
    }
  }
  return matched;
}

/**
 * Sync pipeline with credit protection (deduping against existing catalog)
 */
export async function syncHotstarIPLClips(options: {
  teamTag?: string;
  limit?: number;
  apiKey?: string;
  existingCatalogPath?: string;
}): Promise<{ syncedCount: number; clips: DugoutVaultVideo[] }> {
  const { teamTag = "SRH", limit = 10, apiKey, existingCatalogPath } = options;

  console.log(`[HotstarSync] Discovering cricket clips from Hotstar via Anakin for ${teamTag}...`);
  const hubData = await runAnakinAction(
    "act_hotstar_in_sports_hub_listing",
    { hub_slug: "cricket" },
    { apiKey }
  );

  const items: HotstarRawClip[] = hubData?.items || hubData?.clips || [];
  if (!items.length) {
    console.log(`[HotstarSync] No clips returned from sports hub listing.`);
    return { syncedCount: 0, clips: [] };
  }

  // Load existing catalogue to avoid re-hydrating clips (saving 2 credits per clip)
  const existingIds = new Set<string>();
  if (existingCatalogPath) {
    try {
      const raw = await fs.readFile(existingCatalogPath, "utf-8");
      const list = JSON.parse(raw);
      for (const c of list) {
        if (c.hotstarContentId) existingIds.add(String(c.hotstarContentId));
        if (c.id?.startsWith("HSTAR-")) existingIds.add(c.id.replace("HSTAR-", ""));
      }
    } catch {
      // file might not exist yet, continue
    }
  }

  // Filter for team/franchise match-ups
  const relevantClips = items.filter((clip) => {
    const text = `${clip.title} ${clip.title_slug}`.toLowerCase();
    return text.includes(teamTag.toLowerCase());
  });

  console.log(`[HotstarSync] Found ${relevantClips.length} matching clips for ${teamTag}`);

  const syncedClips: DugoutVaultVideo[] = [];

  // Hydrate watch details only for uncached items
  for (const item of relevantClips.slice(0, limit)) {
    const contentIdStr = String(item.content_id);

    if (existingIds.has(contentIdStr)) {
      console.log(`[HotstarSync] Skipping content_id ${contentIdStr} (already in video vault)`);
      continue;
    }

    try {
      console.log(`[HotstarSync] Hydrating clip metadata for content_id ${contentIdStr}...`);
      const details = await runAnakinAction(
        "act_hotstar_in_sports_clip_watch_page",
        {
          hub_slug: "sports",
          title_slug: item.title_slug,
          content_id: contentIdStr,
        },
        { apiKey }
      );

      const matchedTeams = normalizeTeamCode(item.title);
      const cleanSlug = item.title_slug.startsWith("cricket/") ? item.title_slug : `cricket/${item.title_slug}`;
      const canonicalUrl = `https://www.hotstar.com/in/sports/${cleanSlug}/${contentIdStr}`;

      const vaultEntry: DugoutVaultVideo = {
        id: `HSTAR-${contentIdStr}`,
        title: item.title,
        videoType: "match_highlights",
        originalCategory: "Hotstar Cricket Highlights",
        season: 2026,
        teams: matchedTeams.length ? matchedTeams : [teamTag.toUpperCase()],
        players: [],
        opponent: matchedTeams.length > 1 ? matchedTeams[1] : null,
        duration: details?.duration || item.duration || "01:30",
        description: item.description || details?.description || item.title,
        officialVideoUrl: details?.playback_url || canonicalUrl,
        destinationUrl: canonicalUrl,
        isExactVideoUrl: true,
        broadcaster: "JioHotstar",
        verified: true,
        beyondXiCategory: "Match Coverage",
        suggestedDestination: "Dugout Video Vault",
        keywords: [teamTag.toUpperCase(), "IPL", "Highlights", "Hotstar", ...matchedTeams],
        hotstarContentId: contentIdStr,
        thumbnailUrl: details?.thumbnail_url || item.thumbnail || null,
      };

      syncedClips.push(vaultEntry);
    } catch (err: any) {
      console.warn(`[HotstarSync] Failed fetching clip ${contentIdStr}:`, err.message);
    }
  }

  return { syncedCount: syncedClips.length, clips: syncedClips };
}
