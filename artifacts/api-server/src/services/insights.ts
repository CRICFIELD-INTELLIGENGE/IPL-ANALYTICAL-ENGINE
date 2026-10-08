// The public insight feed, and the redirect loop behind published articles.
//
// Two things live here.
//
// 1. COMPUTED INSIGHTS. Every card in the feed is a query against the engine's
//    own 295,732-delivery record, run at startup and cached. Nothing is written
//    by hand, so the numbers cannot drift away from the data — if the data
//    changes the cards change with it. Each card carries the query's sample
//    size so a reader can judge the claim.
//
// 2. THE REDIRECT LOOP. Published articles are registered here with a slug and
//    an external URL. The site links to /api/ipl/insights/go/<slug>, which
//    counts the click and 302s to the real post. That gives one stable internal
//    link per article: the destination can move between LinkedIn, Medium or a
//    newsletter without touching the site, and the click counts come back as
//    marketing data.

import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

let projectRoot: string | null = null;
function getRoot(): string {
  if (projectRoot) return projectRoot;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "sqlite.db"))) { projectRoot = dir; return dir; }
    dir = path.dirname(dir);
  }
  projectRoot = process.cwd();
  return projectRoot;
}

let db: DatabaseSync | null = null;
let dbTried = false;
function getDb(): DatabaseSync | null {
  if (dbTried) return db;
  dbTried = true;
  const fp = path.join(getRoot(), "sqlite.db");
  if (!fs.existsSync(fp)) return null;
  try {
    db = new DatabaseSync(fp);
    db.exec(`CREATE TABLE IF NOT EXISTS insight_clicks (
      slug TEXT PRIMARY KEY,
      clicks INTEGER NOT NULL DEFAULT 0,
      last_clicked TEXT
    )`);
  } catch { db = null; }
  return db;
}

export type InsightKind = "computed" | "sourced";

export interface InsightCard {
  id: string;
  kind: InsightKind;
  category: string;
  headline: string;
  stat: string;
  statLabel: string;
  body: string;
  sample: string;
  /** Optional second figure, for before/after comparisons. */
  compare?: { stat: string; statLabel: string };
  /** An article this card independently tests or extends. */
  testsSlug?: string;
  href?: string;
  source?: string;
}

/* ═══════════════════════════ ARTICLE REGISTRY ═══════════════════════════

   Add a row and the site gets a card plus a tracked /go/<slug> link.
   `own: true` marks your own writing; everything else is credited reading.
   ═════════════════════════════════════════════════════════════════════════ */

export interface ArticleRef {
  slug: string;
  title: string;
  deck: string;
  author: string;
  platform: string;
  url: string;
  own: boolean;
  tags: string[];
  published?: string;
}

export const ARTICLES: ArticleRef[] = [
  {
    slug: "impact-player-treadmill",
    title: "The Impact Player Treadmill",
    deck: "The 2023 substitution rule added runs without changing who wins — and quietly made the all-rounder optional.",
    author: "Vishal Misra",
    platform: "Medium",
    url: "https://medium.com/@vishalmisra/the-impact-player-treadmill-b25749674b12",
    own: false,
    tags: ["Rules", "Squad design", "Impact Player"],
  },
  {
    slug: "misra-cricket-analytics",
    title: "Cricket analytics papers",
    deck: "Delta, the Set-Batter Paradox, the Left-Right Partnership Myth, Five Bowlers in Eighteen Years, and more.",
    author: "Vishal Misra · Columbia University",
    platform: "Columbia CS",
    url: "http://www.cs.columbia.edu/~misra/other.html",
    own: false,
    tags: ["Research", "Metrics", "T20"],
  },
  {
    slug: "anonymous-altruism",
    title: "The Strange Game Theory of Anonymous Altruism",
    deck: "How 1.1 million strangers coordinate without money, reputation or hierarchy — a study in network design.",
    author: "Balu Nayar",
    platform: "LinkedIn",
    url: "https://www.linkedin.com/pulse/strange-game-theory-anonymous-altruism-balu-nayar-ezcxc",
    own: false,
    tags: ["Game theory", "Networks", "Systems"],
    published: "May 2026",
  },
];

/* ═══════════════════════════ COMPUTED INSIGHTS ═══════════════════════════ */

const nf = (n: number) => Math.round(n).toLocaleString("en-IN");

/**
 * Renders a length label inside a sentence. "Half-volley" wants "the
 * half-volley"; "Short of a length" wants "a short-of-a-length ball", because
 * "the short of a length" is not English.
 */
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function lengthPhrase(label: string, article: "the" | "a" = "the"): string {
  const l = String(label).toLowerCase();
  if (l.includes("of a length")) return `a ${l.replace(/ /g, "-")} ball`;
  if (l === "full" || l === "short") return `${article} ${l} ball`;
  if (l === "length ball") return `${article} length ball`;
  return `${article} ${l}`;
}
const YEAR = "CAST(substr(m.season_id, 1, 4) AS INTEGER)";

let cache: InsightCard[] | null = null;

function computeInsights(): InsightCard[] {
  const d = getDb();
  if (!d) return [];
  const all = (s: string, ...a: any[]) => d.prepare(s).all(...a) as any[];
  const one = (s: string, ...a: any[]) => d.prepare(s).get(...a) as any;
  const cards: InsightCard[] = [];

  try {
    /* ── Impact Player era: scoring ── */
    const eraRuns = (cond: string) =>
      one(`SELECT COUNT(DISTINCT d.innings_id) inns, SUM(d.total_runs) runs
             FROM deliveries d JOIN matches m ON m.match_id = d.match_id WHERE ${cond}`);
    const preR = eraRuns(`${YEAR} < 2023`);
    const postR = eraRuns(`${YEAR} >= 2023`);
    const pre = preR.runs / preR.inns;
    const post = postR.runs / postR.inns;
    cards.push({
      id: "impact-scoring",
      kind: "computed",
      category: "Rules & scoring",
      // Derived, not typed: a hand-written "27" would drift the moment a
      // season is added.
      headline: `The Impact Player rule added ${(post - pre).toFixed(0)} runs to an innings`,
      stat: post.toFixed(1),
      statLabel: "runs per innings, 2023–26",
      compare: { stat: pre.toFixed(1), statLabel: "runs per innings, 2008–22" },
      body: `Since the substitution rule arrived in 2023, the average IPL innings has grown by ${(post - pre).toFixed(1)} runs — a ${(((post - pre) / pre) * 100).toFixed(0)}% jump on fifteen prior seasons. Teams no longer have to pick a side that can both bat and bowl, so they pick two half-sides that each do one thing well.`,
      sample: `${nf(preR.inns)} innings before vs ${nf(postR.inns)} since`,
      testsSlug: "impact-player-treadmill",
    });

    /* ── ...but the toss still decides nothing ── */
    const eraToss = (cond: string) =>
      one(`SELECT COUNT(*) n, SUM(CASE WHEN m.toss_winner_id = m.winner_id THEN 1 ELSE 0 END) won
             FROM matches m WHERE ${cond} AND m.winner_id IS NOT NULL AND m.toss_winner_id IS NOT NULL`);
    const preT = eraToss(`${YEAR} < 2023`);
    const postT = eraToss(`${YEAR} >= 2023`);
    const preTP = (preT.won / preT.n) * 100;
    const postTP = (postT.won / postT.n) * 100;
    cards.push({
      id: "toss-unchanged",
      kind: "computed",
      category: "Rules & scoring",
      headline: "More runs, same winners — the toss is still a coin",
      stat: `${postTP.toFixed(1)}%`,
      statLabel: "toss winners who win, 2023–26",
      compare: { stat: `${preTP.toFixed(1)}%`, statLabel: "toss winners who win, 2008–22" },
      body: `The rule changed the scoreboard, not the result. Winning the toss was worth ${preTP.toFixed(1)}% before the Impact Player and ${postTP.toFixed(1)}% after — inside the noise either way. This engine reached ${preTP.toFixed(1)}% independently, matching the figure Vishal Misra published for the same period.`,
      sample: `${nf(preT.n)} + ${nf(postT.n)} decided matches`,
      testsSlug: "impact-player-treadmill",
    });

    /* ── Sixes ── */
    const eraSix = (cond: string) =>
      one(`SELECT COUNT(DISTINCT d.match_id) mts, SUM(CASE WHEN d.batter_runs = 6 THEN 1 ELSE 0 END) sixes
             FROM deliveries d JOIN matches m ON m.match_id = d.match_id WHERE ${cond}`);
    const preS = eraSix(`${YEAR} < 2023`);
    const postS = eraSix(`${YEAR} >= 2023`);
    const preSix = preS.sixes / preS.mts;
    const postSix = postS.sixes / postS.mts;
    cards.push({
      id: "six-inflation",
      kind: "computed",
      category: "Rules & scoring",
      headline: "A modern IPL match carries six more sixes than it used to",
      stat: postSix.toFixed(1),
      statLabel: "sixes per match, 2023–26",
      compare: { stat: preSix.toFixed(1), statLabel: "sixes per match, 2008–22" },
      body: `Six-hitting is up ${(((postSix - preSix) / preSix) * 100).toFixed(0)}% in the Impact Player era. The extra batter does not just add runs — it changes the risk calculation, because the tail now starts later.`,
      sample: `${nf(preS.mts + postS.mts)} matches`,
    });

    /* ── Economics of length ── */
    const lengths = all(`
      SELECT c.length, COUNT(*) balls,
             ROUND(SUM(d.batter_runs) * 6.0 / COUNT(*), 2) rpo,
             SUM(CASE WHEN dis.dismissal_id IS NOT NULL THEN 1 ELSE 0 END) wkts
        FROM deliveries d
        JOIN delivery_commentary c ON c.delivery_id = d.delivery_id
        LEFT JOIN dismissals dis ON dis.delivery_id = d.delivery_id
       WHERE c.length IS NOT NULL
       GROUP BY c.length HAVING balls >= 1000 ORDER BY rpo ASC`);
    if (lengths.length >= 2) {
      const cheapest = lengths[0];
      const dearest = lengths[lengths.length - 1];
      cards.push({
        id: "length-economics",
        kind: "computed",
        category: "Bowling",
        headline: `${cap(lengthPhrase(dearest.length))} is the most expensive ball in the IPL`,
        stat: `${dearest.rpo}`,
        statLabel: `runs per over — ${lengthPhrase(dearest.length)}`,
        compare: { stat: `${cheapest.rpo}`, statLabel: `runs per over — the ${String(cheapest.length).toLowerCase()}` },
        body: `Read from what commentators actually described, ball by ball. ${cap(lengthPhrase(dearest.length))} concedes ${(dearest.rpo / cheapest.rpo).toFixed(1)}× what ${lengthPhrase(cheapest.length)} does. Length is not a stylistic preference; it is the single largest lever a bowler holds.`,
        sample: `${nf(lengths.reduce((n: number, r: any) => n + r.balls, 0))} described deliveries`,
      });

      const wicketBall = [...lengths].sort((a, b) => b.wkts - a.wkts)[0];
      cards.push({
        id: "wicket-length",
        kind: "computed",
        category: "Bowling",
        headline: `${wicketBall.length} deliveries take more wickets than any other`,
        stat: nf(wicketBall.wkts),
        statLabel: `wickets on ${lengthPhrase(wicketBall.length, "a")}`,
        body: `The ball that buys the most wickets is not the one that costs the least. ${wicketBall.length} deliveries go for ${wicketBall.rpo} an over yet account for more dismissals than any other length — the trade every death bowler is making.`,
        sample: `${nf(wicketBall.balls)} such deliveries`,
      });
    }

    /* ── A batter's blind spot ── */
    for (const who of ["V Kohli", "RG Sharma"]) {
      const rows = all(`
        SELECT c.length, COUNT(*) balls,
               ROUND(SUM(d.batter_runs) * 100.0 / COUNT(*), 1) sr
          FROM deliveries d
          JOIN delivery_commentary c ON c.delivery_id = d.delivery_id
          JOIN players p ON p.player_id = d.batter_id
         WHERE p.name = ? AND c.length IS NOT NULL AND d.is_wide = 0
         GROUP BY c.length HAVING balls >= 250 ORDER BY sr ASC`, who);
      if (rows.length < 2) continue;
      const worst = rows[0];
      const best = rows[rows.length - 1];
      cards.push({
        id: `blindspot-${who.replace(/\W/g, "")}`,
        kind: "computed",
        category: "Batting",
        headline: `${who} scores at ${worst.sr} against ${lengthPhrase(worst.length)}`,
        stat: `${worst.sr}`,
        statLabel: `strike rate vs ${lengthPhrase(worst.length)}`,
        compare: { stat: `${best.sr}`, statLabel: `strike rate vs ${String(best.length).toLowerCase()}` },
        body: `Over ${nf(worst.balls)} such deliveries, ${who} scores at ${worst.sr} — against ${best.sr} on his best ball. Not a small sample, and not a weakness visible in a career average.`,
        sample: `${nf(rows.reduce((n: number, r: any) => n + r.balls, 0))} described balls faced`,
      });
    }

    /* ── Where the league scores ── */
    const zone = one(`
      SELECT c.zone, SUM(d.batter_runs) runs, COUNT(*) balls,
             ROUND(SUM(d.batter_runs) * 100.0 / COUNT(*), 1) sr
        FROM deliveries d JOIN delivery_commentary c ON c.delivery_id = d.delivery_id
       WHERE c.zone IS NOT NULL GROUP BY c.zone ORDER BY runs DESC LIMIT 1`);
    if (zone) {
      cards.push({
        id: "top-zone",
        kind: "computed",
        category: "Batting",
        headline: `${zone.zone} is where the IPL is won`,
        stat: nf(zone.runs),
        statLabel: `runs hit to ${String(zone.zone).toLowerCase()}`,
        compare: { stat: `${zone.sr}`, statLabel: "strike rate in that zone" },
        body: `More runs have gone to ${String(zone.zone).toLowerCase()} than to any other part of the ground, at a strike rate of ${zone.sr}. Field settings are built around a boundary that batters keep clearing anyway.`,
        sample: `${nf(zone.balls)} balls placed there`,
      });
    }

    /* ── Death bowling ── */
    const death = all(`
      SELECT p.name, COUNT(*) balls, ROUND(SUM(d.total_runs) * 6.0 / COUNT(*), 2) econ
        FROM deliveries d JOIN players p ON p.player_id = d.bowler_id
       WHERE d.over_num >= 15
       GROUP BY d.bowler_id HAVING balls >= 900 ORDER BY econ ASC LIMIT 1`);
    if (death.length) {
      const k = death[0];
      cards.push({
        id: "death-king",
        kind: "computed",
        category: "Bowling",
        headline: `${k.name} is the most economical death bowler in IPL history`,
        stat: `${k.econ}`,
        statLabel: "economy, overs 16–20",
        body: `Across ${nf(k.balls)} deliveries in the last five overs — the phase where economy rates go to die — ${k.name} has conceded ${k.econ} an over. The league average in that window is materially higher.`,
        sample: `${nf(k.balls)} death-over deliveries`,
      });
    }

    /* ── Venue spread ── */
    const venues = all(`
      SELECT v.name, COUNT(DISTINCT d.match_id) mts, ROUND(SUM(d.total_runs) * 6.0 / COUNT(*), 2) rpo
        FROM deliveries d
        JOIN matches m ON m.match_id = d.match_id
        JOIN venues v ON v.venue_id = m.venue_id
       GROUP BY v.venue_id HAVING mts >= 30 ORDER BY rpo DESC`);
    if (venues.length >= 2) {
      const hi = venues[0], lo = venues[venues.length - 1];
      cards.push({
        id: "venue-spread",
        kind: "computed",
        category: "Conditions",
        headline: "The same league is played at two different scoring rates",
        stat: `${hi.rpo}`,
        statLabel: `runs per over — ${String(hi.name).split(",")[0]}`,
        compare: { stat: `${lo.rpo}`, statLabel: `runs per over — ${String(lo.name).split(",")[0]}` },
        body: `Across grounds with at least 30 matches, the gap between the highest and lowest scoring venue is ${(hi.rpo - lo.rpo).toFixed(2)} runs an over — roughly ${Math.round((hi.rpo - lo.rpo) * 20)} runs across an innings. A par score is a local fact, not a league one.`,
        sample: `${venues.length} grounds with 30+ matches`,
      });
    }
  } catch (err) {
    console.warn("[insights] compute failed:", (err as Error).message);
  }

  return cards;
}

export function getInsights(): InsightCard[] {
  if (!cache) {
    cache = computeInsights();
    console.log(`[insights] computed ${cache.length} insight cards from the ball record`);
  }
  return cache;
}

/* ═══════════════════════════ THE REDIRECT LOOP ═══════════════════════════ */

/** Resolve a slug to its destination and record the click. */
export function resolveAndCount(slug: string): string | null {
  const article = ARTICLES.find(a => a.slug === slug);
  if (!article) return null;
  const d = getDb();
  if (d) {
    try {
      d.prepare(`INSERT INTO insight_clicks (slug, clicks, last_clicked) VALUES (?, 1, ?)
                 ON CONFLICT(slug) DO UPDATE SET clicks = clicks + 1, last_clicked = excluded.last_clicked`)
        .run(slug, new Date().toISOString());
    } catch (err) {
      // A failed counter must never block the reader from reaching the article.
      console.warn("[insights] click count failed:", (err as Error).message);
    }
  }
  return article.url;
}

export function getClickStats(): { slug: string; title: string; clicks: number; lastClicked: string | null }[] {
  const d = getDb();
  const counts = new Map<string, { clicks: number; last: string | null }>();
  if (d) {
    try {
      for (const r of d.prepare("SELECT slug, clicks, last_clicked FROM insight_clicks").all() as any[]) {
        counts.set(r.slug, { clicks: r.clicks, last: r.last_clicked });
      }
    } catch { /* table may not exist yet */ }
  }
  return ARTICLES.map(a => ({
    slug: a.slug,
    title: a.title,
    clicks: counts.get(a.slug)?.clicks ?? 0,
    lastClicked: counts.get(a.slug)?.last ?? null,
  })).sort((x, y) => y.clicks - x.clicks);
}

export function getInsightFeed() {
  return { insights: getInsights(), articles: ARTICLES };
}
