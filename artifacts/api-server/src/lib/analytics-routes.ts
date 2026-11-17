// Read-only analytics endpoints that may be served by the laptop backend (hybrid hosting).
// Shared by the Vercel function (what it may forward) and the laptop gate (what it will answer),
// so the two can never disagree. Every path here is a GET over immutable cricket data.

const SCOUT_PATHS = new Set([
  "/api/scout/rankings", "/api/scout/search", "/api/scout/compare",
  "/api/scout/roles", "/api/scout/win-probability", "/api/scout/bayes-calculator",
  "/api/scout/t20/coverage", "/api/scout/t20/suggestions",
]);

export function isScoutPath(path: string): boolean {
  return SCOUT_PATHS.has(path)
    || /^\/api\/scout\/(?:t20\/player\/[^/]+|player\/[^/]+(?:\/recent-form)?)$/.test(path);
}

export const IPL_PATHS = new Set([
  "/api/ipl/overview", "/api/ipl/seasons", "/api/ipl/player-career-stats",
  "/api/ipl/player-season-stats", "/api/ipl/stats/query", "/api/ipl/stats/matchup",
  "/api/ipl/stats/scenario", "/api/ipl/stats/drilldown",
  "/api/stats/query", "/api/stats/scenario", "/api/stats/matchup", "/api/stats/drilldown",
]);

/** Served only when the laptop backend is active: the Turso snapshot path never had the data these need. */
export const LAPTOP_ONLY_PATHS = new Set([
  "/api/stats/pressure-reliability", "/api/ipl/team-analytics", "/api/ipl/venue-analytics",
]);

export function isAnalyticsPath(path: string): boolean {
  return isScoutPath(path) || IPL_PATHS.has(path) || LAPTOP_ONLY_PATHS.has(path);
}

/** Header carrying the shared secret from Vercel to the laptop. */
export const ANALYTICS_KEY_HEADER = "x-cricfield-analytics-key";
/** The original browser IP, forwarded by Vercel so per-client rate limits still work behind the proxy. */
export const CLIENT_IP_HEADER = "x-cricfield-client-ip";
