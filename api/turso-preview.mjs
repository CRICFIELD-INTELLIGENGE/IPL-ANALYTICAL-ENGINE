const databases = {
  ipl: {
    url: "TURSO_IPL_DATABASE_URL",
    token: "TURSO_IPL_AUTH_TOKEN",
    sql: "SELECT (SELECT count(*) FROM matches) AS matches, (SELECT count(*) FROM innings) AS innings, (SELECT count(*) FROM deliveries) AS deliveries",
  },
  scout: {
    url: "TURSO_SCOUT_DATABASE_URL",
    token: "TURSO_SCOUT_AUTH_TOKEN",
    sql: "SELECT c.code, c.name, c.format, count(m.match_id) AS matches, max(m.start_date) AS through FROM competitions c JOIN matches m USING (competition_id) WHERE c.format IN ('T20', 'T20I') GROUP BY c.competition_id ORDER BY c.format DESC, c.name",
  },
};

function json(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "method_not_allowed" });
  }

  const warehouse = req.query?.warehouse;
  if (warehouse !== "ipl" && warehouse !== "scout") {
    return json(res, 400, { error: "warehouse_must_be_ipl_or_scout" });
  }

  const config = databases[warehouse];
  const host = process.env[config.url];
  const token = process.env[config.token];
  if (!host || !token) return json(res, 503, { error: "warehouse_not_configured" });

  try {
    const origin = new URL(host.replace(/^libsql:\/\//, "https://"));
    if (origin.protocol !== "https:" || !origin.hostname.endsWith(".turso.io")) {
      return json(res, 503, { error: "invalid_warehouse_configuration" });
    }

    const response = await fetch(new URL("/v2/pipeline", origin), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{ type: "execute", stmt: { sql: config.sql } }, { type: "close" }],
      }),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return json(res, 502, { error: "warehouse_request_failed" });

    const payload = await response.json();
    const result = payload.results?.[0]?.response?.result;
    if (!Array.isArray(result?.cols) || !Array.isArray(result?.rows) || !result.rows.length) {
      return json(res, 502, { error: "warehouse_result_unavailable" });
    }

    const rows = result.rows.map(row => Object.fromEntries(
      result.cols.map((column, index) => {
        const cell = row[index];
        return [column.name, cell.type === "integer" ? Number(cell.value) : cell.value ?? null];
      }),
    ));
    return json(res, 200, { warehouse, rows });
  } catch {
    return json(res, 502, { error: "warehouse_request_failed" });
  }
}
