// Which of the content-engine articles belong on a franchise or player page.
//
// Keyed by each article's `day`, which is its stable id in CONTENT_ENGINE_100.
// An article appears under a franchise or player only if it is listed here.
// Nothing is matched by keyword: each link was set by reading the article.
// Articles that are about no single franchise (most of the series) are not
// linked, and the newsroom says so rather than showing them under a team.

import { CONTENT_ENGINE_100, type ContentArticle } from "@/lib/content-engine-100";

export const ARTICLE_LINKS: Record<number, { teams: string[]; players: string[] }> = {
  // Kohli's career has been with RCB, so his articles are linked to the team too.
  1: { teams: ["RCB"], players: ["Virat Kohli"] },
  80: { teams: ["RCB"], players: ["Virat Kohli"] },
  6: { teams: ["MI"], players: ["Jasprit Bumrah"] },
  16: { teams: ["CSK"], players: [] },
  17: { teams: ["CSK"], players: ["MS Dhoni"] },
  81: { teams: ["CSK"], players: ["MS Dhoni"] },
  82: { teams: ["MI"], players: ["Rohit Sharma"] },
  // Its summary contrasts two franchise mottos, Korbo Lorbo Jeetbo (KKR) and Halla Bol (RR).
  21: { teams: ["KKR", "RR"], players: [] },
};

const newestFirst = (a: ContentArticle, b: ContentArticle) => b.day - a.day;

export function articlesForTeam(code: string): ContentArticle[] {
  return CONTENT_ENGINE_100.filter((a) => ARTICLE_LINKS[a.day]?.teams.includes(code)).sort(newestFirst);
}

/** Articles linked to a player under any of the names the data uses for them. */
export function articlesForPlayer(...names: (string | null | undefined)[]): ContentArticle[] {
  const wanted = names.filter((n): n is string => Boolean(n));
  return CONTENT_ENGINE_100.filter((a) => ARTICLE_LINKS[a.day]?.players.some((p) => wanted.includes(p))).sort(newestFirst);
}
