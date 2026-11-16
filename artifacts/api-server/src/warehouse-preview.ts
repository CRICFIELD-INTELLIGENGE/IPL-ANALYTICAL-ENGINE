import type { IncomingMessage, ServerResponse } from "node:http";
import { mkdtempSync } from "node:fs";
import { rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadWarehouseSnapshot } from "./services/turso-snapshot";

const scoutPaths = new Set(["/api/scout/rankings", "/api/scout/t20/suggestions"]);
const iplPaths = new Set([
  "/api/ipl/overview", "/api/ipl/seasons", "/api/ipl/player-career-stats",
  "/api/ipl/player-season-stats", "/api/ipl/stats/query", "/api/ipl/stats/matchup",
  "/api/ipl/stats/scenario", "/api/ipl/stats/drilldown",
  "/api/stats/query", "/api/stats/scenario", "/api/stats/matchup", "/api/stats/drilldown",
]);

const warehouseDirectory = mkdtempSync(join(tmpdir(), "cricfield-preview-"));
const scoutPath = join(warehouseDirectory, "global.db");
const iplPath = join(warehouseDirectory, "sqlite.db");

let scout: Promise<void> | undefined;
let ipl: Promise<void> | undefined;
let app: Promise<(req: IncomingMessage, res: ServerResponse) => void> | undefined;

function configureScout() {
  const url = process.env.TURSO_SCOUT_DATABASE_URL;
  const token = process.env.TURSO_SCOUT_AUTH_TOKEN;
  if (!url || !token) throw new Error("Scout credentials missing");
  return loadWarehouseSnapshot(url, token, "global.db", [
    "players", "competitions", "matches", "agg_batting", "agg_bowling", "scout_coverage", "player_attributes",
  ]).then(file => rename(file, scoutPath));
}

function configureIpl() {
  const url = process.env.TURSO_IPL_DATABASE_URL;
  const token = process.env.TURSO_IPL_AUTH_TOKEN;
  if (!url || !token) throw new Error("IPL credentials missing");
  return loadWarehouseSnapshot(url, token, "sqlite.db", [
    "matches", "innings", "deliveries", "players", "seasons",
  ]).then(file => rename(file, iplPath));
}

function json(res: ServerResponse, status: number, error: string) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify({ error }));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const target = new URL(req.url ?? "/", "http://localhost");
  const path = (target.searchParams.get("__warehouseRoute") ?? target.pathname).replace(/\/$/, "");
  target.searchParams.delete("__warehouseRoute");
  req.url = path + target.search;
  const isScout = scoutPaths.has(path);
  if (!isScout && !iplPaths.has(path)) return json(res, 404, "not_found");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, "method_not_allowed");
  }

  try {
    // Set stable cache paths before Express imports the SQLite adapters.
    process.env.CRICFIELD_DB_READONLY = "1";
    process.env.CRICFIELD_SCOUT_DB_PATH = scoutPath;
    process.env.CRICFIELD_DB_PATH = iplPath;
    if (isScout) {
      scout ??= configureScout().catch(error => { scout = undefined; throw error; });
      await scout;
    } else {
      ipl ??= configureIpl().catch(error => { ipl = undefined; throw error; });
      await ipl;
    }
    app ??= import("./app.js").then(
      module => module.default as unknown as (req: IncomingMessage, res: ServerResponse) => void,
    );
    return (await app)(req, res);
  } catch (error) {
    // Provider URLs and authorization details must never enter the response.
    console.error("Warehouse preview initialization failed", error instanceof Error ? error.name : "Error");
    return json(res, 503, isScout ? "global_warehouse_unavailable" : "ipl_warehouse_unavailable");
  }
}
