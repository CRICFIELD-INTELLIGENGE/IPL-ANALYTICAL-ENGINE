import { logger } from "../lib/logger";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

export interface MatchInfo {
  matchId: number;
  seriesId: number;
  seriesName: string;
  matchDesc: string;
  matchFormat: string;
  startDate: number;
  endDate: number;
  state: string;
  status: string;
  team1: { teamId: number; teamName: string; teamSName: string; imageId?: number };
  team2: { teamId: number; teamName: string; teamSName: string; imageId?: number };
  venueInfo?: { id: number; ground: string; city: string; timezone?: string };
  currBatTeamId?: number;
  isTournament?: boolean;
  matchType?: string;
}

export interface MatchScore {
  team1Score?: { inngs1?: { runs?: number; wickets?: number; overs?: number } };
  team2Score?: { inngs1?: { runs?: number; wickets?: number; overs?: number } };
}

export interface LiveMatch {
  matchInfo: MatchInfo;
  matchScore?: MatchScore;
}

interface CacheEntry<T> {
  ts: number;
  data: T;
}

const cache = new Map<string, CacheEntry<unknown>>();
const TTL = 30_000; // 30 seconds
const MAX_CACHE_KEYS = 32; // hard cap; insertion order eviction

async function cached<T>(key: string, fetcher: () => Promise<T>, ttl = TTL): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttl) return hit.data as T;
  try {
    const data = await fetcher();
    if (cache.size >= MAX_CACHE_KEYS && !cache.has(key)) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(key, { ts: Date.now(), data });
    return data;
  } catch (err) {
    if (hit) {
      logger.warn({ err, key }, "Live fetch failed; serving stale cache");
      return hit.data as T;
    }
    throw err;
  }
}

function decodeRscString(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

async function fetchCricbuzzPage(path: string): Promise<string> {
  const res = await fetch(`https://www.cricbuzz.com${path}`, {
    headers: BROWSER_HEADERS,
  });
  if (!res.ok) throw new Error(`Cricbuzz ${path} returned ${res.status}`);
  return res.text();
}

function extractRscPayload(html: string): string {
  const re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let combined = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    combined += decodeRscString(m[1]);
  }
  return combined;
}

function extractAllJsonObjects(payload: string, key: string): any[] {
  const results: any[] = [];
  const search = `"${key}":{`;
  let idx = 0;
  while ((idx = payload.indexOf(search, idx)) !== -1) {
    const start = idx + search.length - 1; // position of opening brace
    let depth = 0;
    let end = -1;
    for (let i = start; i < payload.length; i++) {
      const c = payload[i];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      } else if (c === '"') {
        // skip string
        i++;
        while (i < payload.length) {
          if (payload[i] === "\\") { i += 2; continue; }
          if (payload[i] === '"') break;
          i++;
        }
      }
    }
    if (end === -1) break;
    const json = payload.substring(start, end + 1);
    try {
      results.push(JSON.parse(json));
    } catch {
      // skip
    }
    idx = end + 1;
  }
  return results;
}

export async function getCricbuzzMatches(): Promise<LiveMatch[]> {
  return cached("cb:matches", async () => {
    const html = await fetchCricbuzzPage("/cricket-match/live-scores");
    const payload = extractRscPayload(html);
    const matches: LiveMatch[] = [];
    const seen = new Set<number>();

    const matchInfos = extractAllJsonObjects(payload, "matchInfo") as MatchInfo[];
    const matchScores = extractAllJsonObjects(payload, "matchScore") as MatchScore[];

    for (let i = 0; i < matchInfos.length; i++) {
      const info = matchInfos[i];
      if (!info || typeof info.matchId !== "number") continue;
      if (seen.has(info.matchId)) continue;
      seen.add(info.matchId);
      matches.push({ matchInfo: info, matchScore: matchScores[i] });
    }
    return matches;
  });
}

export async function getIplMatches(): Promise<LiveMatch[]> {
  const all = await getCricbuzzMatches();
  return all.filter((m) =>
    /Indian Premier League|IPL/i.test(m.matchInfo.seriesName)
  );
}

export interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  image?: string;
  category?: string;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&");
}

function extractTag(item: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = item.match(re);
  return m ? decodeXmlEntities(m[1].trim()) : "";
}

function extractMediaUrl(item: string): string | undefined {
  const m = item.match(/<media:content[^>]*url=["']([^"']+)["']/);
  if (m) return m[1];
  const cov = item.match(/<coverImages>([\s\S]*?)<\/coverImages>/);
  if (cov) return decodeXmlEntities(cov[1].trim());
  return undefined;
}

const NEWS_FEEDS: Record<string, string> = {
  general: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml",
  ipl: "https://www.espncricinfo.com/rss/content/story/feeds/8048.xml",
};
export type NewsCategory = keyof typeof NEWS_FEEDS;

export function isValidNewsCategory(c: string): c is NewsCategory {
  return Object.prototype.hasOwnProperty.call(NEWS_FEEDS, c);
}

export async function getEspnNews(category: NewsCategory = "general"): Promise<NewsItem[]> {
  const safe: NewsCategory = isValidNewsCategory(category) ? category : "general";
  const url = NEWS_FEEDS[safe];
  return cached(`espn:news:${safe}`, async () => {
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (!res.ok) throw new Error(`ESPN RSS ${category} returned ${res.status}`);
    const xml = await res.text();
    const items: NewsItem[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const m of itemMatches) {
      const block = m[1];
      const title = extractTag(block, "title");
      if (!title) continue;
      items.push({
        title,
        description: extractTag(block, "description"),
        link: extractTag(block, "link"),
        pubDate: extractTag(block, "pubDate"),
        image: extractMediaUrl(block),
        category,
      });
    }
    return items;
  }, 60_000);
}
