/**
 * VIDEO CLIP ROUTER CLIENT & NAVIGATION HANDLER
 * ─────────────────────────────────────────────────────────────────────────────
 * Matches user intent to the single most relevant video from the catalog
 * and handles redirects to official JioHotstar clip destinations.
 */

export interface ClipCatalogItem {
  id: string;
  title: string;
  keywords: string[];
  url: string;
}

export interface ClipRouteResponse {
  matched: boolean;
  clip_id: string | null;
  title: string | null;
  url: string | null;
}

import videoData from "@/data/video-catalogue.json";

export const CLIP_CATALOG: ClipCatalogItem[] = (videoData as any[]).map((v) => ({
  id: v.id,
  title: v.title,
  keywords: v.keywords || [],
  url: v.destinationUrl,
}));

/**
 * Client-side local matcher used as immediate fallback if server is unreachable
 */
export function matchClipClientSide(userInput: string): ClipRouteResponse {
  if (!userInput || !userInput.trim()) {
    return { matched: false, clip_id: null, title: null, url: null };
  }

  const q = userInput.toLowerCase().replace(/[*'"]/g, "").trim();
  const qTokens = q.split(/\s+/).filter(Boolean);

  let bestClip: ClipCatalogItem | null = null;
  let bestScore = 0;

  for (const item of CLIP_CATALOG) {
    let score = 0;
    const titleLower = item.title.toLowerCase();

    for (const kw of item.keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += 3;
      }
    }

    for (const token of qTokens) {
      if (token.length > 2 && titleLower.includes(token)) {
        score += 2;
      }
    }

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
 * Queries the video navigation router API and returns target clip data.
 */
export async function getClipRoute(userInput: string): Promise<ClipRouteResponse> {
  try {
    const apiBase = `${import.meta.env.BASE_URL}api`.replace(/\/+$/, "");
    const res = await fetch(`${apiBase}/get-clip-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: userInput }),
    });

    if (res.ok) {
      const data: ClipRouteResponse = await res.json();
      return data;
    }
  } catch (_err) {
    // Backend offline or running in preview: fallback to deterministic client matcher
  }

  return matchClipClientSide(userInput);
}

/**
 * Searches for a video clip based on user query and opens it in a new tab if matched.
 */
export async function searchAndOpenClip(userInput: string): Promise<ClipRouteResponse> {
  const data = await getClipRoute(userInput);

  if (data.matched && data.url) {
    // Redirects to the specific clip in a new tab
    window.open(data.url, "_blank", "noopener,noreferrer");
  } else {
    alert("No clip matched your description. Please try different keywords.");
  }

  return data;
}
