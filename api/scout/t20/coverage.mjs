const coverageSql = "SELECT c.code, c.name, c.format, count(m.match_id) AS matches, max(m.start_date) AS through FROM competitions c JOIN matches m USING (competition_id) WHERE c.format IN ('T20', 'T20I') GROUP BY c.competition_id ORDER BY c.format DESC, c.name";
const teamsSql = `SELECT DISTINCT t.team_id id, t.name, a.season_label season
  FROM agg_appearances a JOIN teams t USING (team_id) JOIN competitions c ON c.competition_id = a.competition_id
  WHERE c.code = 'ipl' AND a.season_label = (
    SELECT season_label FROM seasons WHERE competition_id = c.competition_id
    ORDER BY season_year DESC, start_date DESC LIMIT 1
  ) ORDER BY t.name`;

function decode({ response }) {
  const result = response?.result;
  if (!Array.isArray(result?.cols) || !Array.isArray(result?.rows) || !result.rows.length) {
    throw new Error("Warehouse query returned no data");
  }
  return result.rows.map(row => Object.fromEntries(result.cols.map(({ name }, i) => {
    const cell = row[i];
    return [name, cell.type === "integer" ? Number(cell.value) : cell.value ?? null];
  })));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const host = process.env.TURSO_SCOUT_DATABASE_URL;
  const token = process.env.TURSO_SCOUT_AUTH_TOKEN;
  if (!host || !token) return res.status(503).json({ error: "global_warehouse_unavailable" });

  try {
    const origin = new URL(host.replace(/^libsql:\/\//, "https://"));
    if (origin.protocol !== "https:" || !origin.hostname.endsWith(".turso.io")) {
      return res.status(503).json({ error: "global_warehouse_unavailable" });
    }
    const result = await fetch(new URL("/v2/pipeline", origin), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [...[coverageSql, teamsSql].map(sql => ({ type: "execute", stmt: { sql } })), { type: "close" }],
      }),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!result.ok) throw new Error("Warehouse transport failed");
    const { results } = await result.json();
    const competitions = decode(results[0]);
    const teams = decode(results[1]);
    res.setHeader("Cache-Control", "public, max-age=60");
    res.setHeader("Vercel-CDN-Cache-Control", "public, s-maxage=600");
    return res.status(200).json({ competitions, teams });
  } catch {
    return res.status(502).json({ error: "global_warehouse_unavailable" });
  }
}
