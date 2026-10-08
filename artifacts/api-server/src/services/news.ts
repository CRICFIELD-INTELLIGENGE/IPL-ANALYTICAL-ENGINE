// Live news wire for the IPL data desk.
//
// Pulls real RSS from ESPNcricinfo and from Google News queries tuned to the
// data, business and media side of the league, parses it, de-duplicates it and
// caches it for a few minutes.
//
// The per-source status is part of the payload on purpose. If a feed 403s or
// times out, the page says which one and why rather than quietly rendering a
// shorter list — a news surface that silently drops a source is indistinguishable
// from one where nothing happened today.

import { XMLParser } from "fast-xml-parser";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceId: string;
  section: string;
  publisher: string | null;
  publishedAt: string | null;
  image: string | null;
  isIpl: boolean;
}

export interface FeedStatus {
  id: string;
  name: string;
  section: string;
  ok: boolean;
  count: number;
  error?: string;
}

const gnews = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;

interface FeedDef { id: string; name: string; section: string; url: string }

/**
 * Google News is used for the themed desks because it aggregates across
 * publishers; ESPNcricinfo's own feed carries the cricket wire.
 */
const FEEDS: FeedDef[] = [
  { id: "espn", name: "ESPNcricinfo", section: "Wire", url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml" },
  { id: "gn-data", name: "Data & analytics", section: "Data", url: gnews("IPL cricket data analytics") },
  { id: "gn-business", name: "Business & revenue", section: "Business", url: gnews("IPL business revenue sponsorship franchise valuation") },
  { id: "gn-media", name: "Media & viewership", section: "Media", url: gnews("IPL media rights broadcast viewership streaming") },
  { id: "gn-auction", name: "Auction & squads", section: "Auction", url: gnews("IPL auction player price squad") },
];

export const NEWS_SECTIONS = ["Data", "Business", "Media", "Auction", "Wire"] as const;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Titles routinely contain &amp; and friends; leaving them encoded would show
  // the entities to the reader.
  processEntities: true,
  trimValues: true,
});

const TTL_MS = 10 * 60 * 1000;
let cache: { items: NewsItem[]; statuses: FeedStatus[]; fetchedAt: string } | null = null;
let inFlight: Promise<void> | null = null;

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">",
  "&quot;": '"', "&#39;": "'", "&apos;": "'", "&hellip;": "…",
  "&ndash;": "–", "&mdash;": "—", "&rsquo;": "’", "&lsquo;": "‘",
};

const strip = (html: string) =>
  String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, m => ENTITIES[m.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Stable id from the whole URL.
 *
 * Truncating base64 of the link looked fine until it shipped: every Google News
 * article URL begins "https://news.google.com/rss/articles/", so the first 24
 * base64 characters were identical for every story from those feeds. React saw
 * duplicate keys and is free to drop or duplicate rows, which on a news list
 * means stories silently going missing.
 */
function hashId(url: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36) + url.length.toString(36);
}

/** Comparable form of a headline, for spotting a summary that just repeats it. */
const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Google News titles arrive as "Headline - Publisher"; split the tail off. */
function splitPublisher(title: string): { title: string; publisher: string | null } {
  const m = /^(.*)\s+[-–—]\s+([^-–—]{2,40})$/.exec(title);
  if (!m) return { title, publisher: null };
  return { title: m[1].trim(), publisher: m[2].trim() };
}

/**
 * Franchise names have to be spelled out. The Hundred fields a "Sunrisers"
 * (Leeds) and an "MI London", so a bare franchise word tagged county cricket as
 * IPL — the wire filled up with Women's Hundred results.
 */
const IPL_RE = new RegExp(
  [
    "\\bIPL\\b",
    "indian premier league",
    "chennai super kings",
    "royal challengers (bengaluru|bangalore)",
    "mumbai indians",
    "kolkata knight riders",
    "sunrisers hyderabad",
    "rajasthan royals",
    "delhi capitals",
    "punjab kings",
    "lucknow super giants",
    "gujarat titans",
  ].join("|"),
  "i",
);

function toItems(xml: string, feed: FeedDef): NewsItem[] {
  const doc = parser.parse(xml);
  const raw = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  const out: NewsItem[] = [];

  for (const it of list) {
    if (!it) continue;
    const rawTitle = strip(typeof it.title === "object" ? it.title["#text"] : it.title);
    if (!rawTitle) continue;

    const link = typeof it.link === "object" ? (it.link["@_href"] ?? it.link["#text"]) : it.link;
    if (!link) continue;

    const { title, publisher } = splitPublisher(rawTitle);
    // Aggregators occasionally surface a site's front page as if it were a
    // story ("IPL T20 | Indian Premier League Official Website"). It has no
    // article behind it, so it is dropped rather than given a slot.
    if (/official (web)?site|^home$|homepage/i.test(title)) continue;
    // Google News sets description to the headline plus the publisher name, so
    // a summary that merely restates the title is dropped rather than shown as
    // if it were a standfirst.
    let summary = strip(it.description ?? it.summary ?? "");
    if (summary && norm(summary).startsWith(norm(rawTitle).slice(0, 40))) summary = "";
    const image =
      it.coverImages ??
      it["media:content"]?.["@_url"] ??
      it["media:thumbnail"]?.["@_url"] ??
      it.enclosure?.["@_url"] ??
      null;

    const pub = it.pubDate ?? it.published ?? it.updated ?? null;
    let publishedAt: string | null = null;
    if (pub) {
      const d = new Date(pub);
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }

    out.push({
      id: `${feed.id}:${hashId(String(link))}`,
      title,
      summary: summary.slice(0, 260),
      url: String(link),
      source: feed.name,
      sourceId: feed.id,
      section: feed.section,
      publisher: publisher ?? (feed.id === "espn" ? "ESPNcricinfo" : null),
      publishedAt,
      image: typeof image === "string" ? image : null,
      isIpl: IPL_RE.test(`${title} ${summary}`),
    });
  }
  return out;
}

async function fetchFeed(feed: FeedDef): Promise<{ items: NewsItem[]; status: FeedStatus }> {
  const base: FeedStatus = { id: feed.id, name: feed.name, section: feed.section, ok: false, count: 0 };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { items: [], status: { ...base, error: `HTTP ${res.status}` } };
    const xml = await res.text();
    const items = toItems(xml, feed);
    return { items, status: { ...base, ok: true, count: items.length } };
  } catch (err) {
    return { items: [], status: { ...base, error: (err as Error).message || "fetch failed" } };
  }
}

async function refresh(): Promise<void> {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const seen = new Set<string>();
  const items: NewsItem[] = [];

  for (const r of results) {
    for (const it of r.items) {
      // The same story reaches several desks through Google News; keep the
      // first sighting so a section is not padded by its own duplicates.
      const key = it.title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 70);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push(it);
    }
  }

  items.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });

  cache = { items, statuses: results.map(r => r.status), fetchedAt: new Date().toISOString() };
  const live = cache.statuses.filter(s => s.ok).length;
  console.log(`[news] ${items.length} stories from ${live}/${FEEDS.length} feeds`);
}

export async function getNews(force = false) {
  const stale = !cache || Date.now() - Date.parse(cache.fetchedAt) > TTL_MS;
  if (force || stale) {
    // One refresh at a time; concurrent callers await the same fetch rather
    // than each firing their own round of requests at the sources.
    if (!inFlight) inFlight = refresh().finally(() => { inFlight = null; });
    try {
      await inFlight;
    } catch (err) {
      console.warn("[news] refresh failed:", (err as Error).message);
    }
  }
  return cache ?? { items: [], statuses: FEEDS.map(f => ({ id: f.id, name: f.name, section: f.section, ok: false, count: 0, error: "not fetched" })), fetchedAt: new Date().toISOString() };
}
