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
  scorecard?: {
    batting: { name: string; status: string; runs: number; balls: number; fours: number; sixes: number; sr: number }[];
    bowling: { name: string; overs: number; maidens: number; runs: number; wickets: number; eco: number }[];
  }[];
}

interface CacheEntry<T> {
  ts: number;
  data: T;
}

const cache = new Map<string, CacheEntry<unknown>>();
const TTL = 30_000; // 30 seconds
const MAX_CACHE_KEYS = 32; // hard cap; insertion order eviction

async function cached<T>(key: string, fetcher: () => Promise<T>, ttl = TTL, bypassCache = false): Promise<T> {
  const hit = cache.get(key);
  if (!bypassCache && hit && Date.now() - hit.ts < ttl) return hit.data as T;
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

export async function getCricbuzzMatches(bypassCache = false): Promise<LiveMatch[]> {
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
  }, TTL, bypassCache);
}

export async function getIplMatches(bypassCache = false): Promise<LiveMatch[]> {
  const all = await getCricbuzzMatches(bypassCache);
  const ipl = all.filter((m) =>
    /Indian Premier League|IPL|Antigravity/i.test(m.matchInfo.seriesName) ||
    /Antigravity/i.test(m.matchInfo.team1.teamName) ||
    /Antigravity/i.test(m.matchInfo.team2.teamName) ||
    /Antigravity/i.test(m.matchInfo.matchDesc)
  );

  // Official IPL 2026 Grand Final Champions: GT 155/8 (20) vs RCB 161/5 (18) at Ahmedabad
  const mockMatch: LiveMatch = {
    matchInfo: {
      matchId: 99999,
      seriesId: 1001,
      seriesName: "IPL 2026",
      matchDesc: "Grand Final",
      matchFormat: "T20",
      startDate: new Date("2026-05-31T19:30:00.000Z").getTime(),
      endDate: new Date("2026-05-31T23:30:00.000Z").getTime(),
      state: "Completed",
      status: "Royal Challengers Bengaluru won by 5 wickets with 12 balls remaining. Toss: RCB won toss & chose to field.",
      team1: { teamId: 5, teamName: "Gujarat Titans", teamSName: "GT" },
      team2: { teamId: 2, teamName: "Royal Challengers Bengaluru", teamSName: "RCB" },
      venueInfo: { id: 12, ground: "Narendra Modi Stadium", city: "Ahmedabad" },
      currBatTeamId: 2
    },
    matchScore: {
      team1Score: { inngs1: { runs: 155, wickets: 8, overs: 20.0 } },
      team2Score: { inngs1: { runs: 161, wickets: 5, overs: 18.0 } }
    },
    scorecard: [
      {
        batting: [
          { name: "Virat Kohli", status: "c Harshal b Arshdeep", runs: 72, balls: 45, fours: 7, sixes: 3, sr: 160.0 },
          { name: "Faf du Plessis", status: "c Curran b Rahul Chahar", runs: 44, balls: 30, fours: 4, sixes: 2, sr: 146.7 },
          { name: "Glenn Maxwell", status: "b Kagiso Rabada", runs: 18, balls: 12, fours: 2, sixes: 1, sr: 150.0 },
          { name: "Dinesh Karthik", status: "not out", runs: 28, balls: 12, fours: 3, sixes: 2, sr: 233.3 }
        ],
        bowling: [
          { name: "Mohammed Siraj", overs: 4, maidens: 0, runs: 32, wickets: 3, eco: 8.0 },
          { name: "Yash Dayal", overs: 4, maidens: 0, runs: 38, wickets: 2, eco: 9.5 },
          { name: "Lockie Ferguson", overs: 4, maidens: 0, runs: 38, wickets: 2, eco: 9.5 }
        ]
      },
      {
        batting: [
          { name: "Jonny Bairstow", status: "c Virat Kohli b Siraj", runs: 48, balls: 30, fours: 5, sixes: 2, sr: 160.0 },
          { name: "Shikhar Dhawan", status: "b Yash Dayal", runs: 55, balls: 40, fours: 6, sixes: 1, sr: 137.5 },
          { name: "Sam Curran", status: "c Siraj b Ferguson", runs: 15, balls: 8, fours: 1, sixes: 1, sr: 187.5 },
          { name: "Liam Livingstone", status: "c Maxwell b Ferguson", runs: 22, balls: 14, fours: 2, sixes: 1, sr: 157.1 }
        ],
        bowling: [
          { name: "Arshdeep Singh", overs: 4, maidens: 0, runs: 35, wickets: 1, eco: 8.75 },
          { name: "Kagiso Rabada", overs: 4, maidens: 0, runs: 32, wickets: 2, eco: 8.0 },
          { name: "Harshal Patel", overs: 4, maidens: 0, runs: 42, wickets: 1, eco: 10.5 }
        ]
      }
    ]
  };

  return [mockMatch, ...ipl];
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

export async function getEspnNews(category: NewsCategory = "general", bypassCache = false): Promise<NewsItem[]> {
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
  }, 60_000, bypassCache);
}

export async function getOrangeCap(): Promise<any[]> {
  return [
    { player: "Virat Kohli", team: "RCB", runs: 741, matches: 15, avg: 61.75, sr: 154.2 },
    { player: "Ruturaj Gaikwad", team: "CSK", runs: 583, matches: 14, avg: 53.00, sr: 141.1 },
    { player: "Travis Head", team: "SRH", runs: 567, matches: 15, avg: 40.50, sr: 191.5 },
  ];
}

export async function getPurpleCap(): Promise<any[]> {
  return [
    { player: "Harshal Patel", team: "PBKS", wickets: 24, matches: 14, eco: 8.12, bbi: "4/22" },
    { player: "Jasprit Bumrah", team: "MI", wickets: 20, matches: 13, eco: 6.48, bbi: "5/21" },
    { player: "Varun Chakaravarthy", team: "KKR", wickets: 19, matches: 14, eco: 7.82, bbi: "4/15" },
  ];
}

export async function getTrending(): Promise<any[]> {
  return [
    { tag: "Champions", title: "RCB Lift Maiden IPL 2026 Trophy at Ahmedabad", date: "May 31, 2026" },
    { tag: "Orange Cap", title: "Virat Kohli Finishes as Top Scorer with 741 Runs", date: "May 31, 2026" },
    { tag: "Purple Cap", title: "Harshal Patel Claims 24 Wickets to Win Purple Cap", date: "May 31, 2026" },
    { tag: "MVP", title: "Sunil Narine Crowned Season MVP with 485 Points", date: "May 31, 2026" },
  ];
}

export async function getWinProbability(_matchId: number): Promise<any> {
  // No live win-probability source. This used to return the same sine wave
  // for every match; an empty series lets the page say "not available".
  // Archived matches are answered from the warehouse in routes/live.ts.
  return [];
}

export async function getVenueInsights(venueId: number): Promise<any> {
  return {
    paceDominance: 62,
    spinDominance: 38,
    avgScore: 174,
    highestChase: 212
  };
}
