import type { IncomingMessage, ServerResponse } from "node:http";
import { mkdtempSync, existsSync, copyFileSync, rmSync } from "node:fs";
import { rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadWarehouseSnapshot } from "./services/turso-snapshot.js";
import { scoutPostgresConfigured, loadScoutFromPostgres } from "./services/scout/scout-postgres.js";
import { isScoutPath, IPL_PATHS, isAnalyticsPath, LAPTOP_ONLY_PATHS, ANALYTICS_KEY_HEADER, CLIENT_IP_HEADER } from "./lib/analytics-routes.js";
import app from "./app.js";

// Routing switch (Vercel env CRICFIELD_ANALYTICS_MODE):
//   "turso"  (default, unset) — the existing path: Turso snapshot loaded into the function.
//   "laptop"                  — forward to CRICFIELD_ANALYTICS_ORIGIN; if it is down, an explicit 503.
//   "laptop-then-turso"       — forward; if the laptop is down, fall back to the Turso path.
// Rolling back is unsetting the variable and redeploying.
const mode = (process.env.CRICFIELD_ANALYTICS_MODE ?? "turso").trim().toLowerCase();
const laptopOrigin = process.env.CRICFIELD_ANALYTICS_ORIGIN?.trim();
const laptopKey = process.env.CRICFIELD_ANALYTICS_KEY?.trim();
const laptopEnabled = (mode === "laptop" || mode === "laptop-then-turso") && !!laptopOrigin && !!laptopKey;
const LAPTOP_TIMEOUT_MS = 25_000;

const warehouseDirectory = mkdtempSync(join(tmpdir(), "cricfield-preview-"));
const scoutPath = join(warehouseDirectory, "global.db");
const iplPath = join(warehouseDirectory, "sqlite.db");

let scout: Promise<void> | undefined;
let ipl: Promise<void> | undefined;

function configureScout() {
  if (existsSync(scoutPath)) return Promise.resolve();
  const fallback = process.env.CRICFIELD_LOCAL_SCOUT_PATH;
  if (fallback && existsSync(fallback)) {
    copyFileSync(fallback, scoutPath);
    return Promise.resolve();
  }
  if (scoutPostgresConfigured()) {
    const staging = `${scoutPath}.loading`;
    rmSync(staging, { force: true });
    return loadScoutFromPostgres(staging).then(() => rename(staging, scoutPath));
  }
  const url = process.env.TURSO_SCOUT_DATABASE_URL;
  const token = process.env.TURSO_SCOUT_AUTH_TOKEN;
  if (!url || !token) throw new Error("Scout credentials missing");
  return loadWarehouseSnapshot(url, token, "global.db", [
    "players", "competitions", "matches", "agg_batting", "agg_bowling", "scout_coverage", "player_attributes",
  ]).then(file => rename(file, scoutPath));
}

function configureIpl() {
  if (existsSync(iplPath)) return Promise.resolve();
  const fallback = process.env.CRICFIELD_LOCAL_DB_PATH || process.env.CRICFIELD_FALLBACK_DB_PATH;
  if (fallback && existsSync(fallback)) {
    copyFileSync(fallback, iplPath);
    return Promise.resolve();
  }
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

/**
 * One attempt, no retries (a struggling laptop must not be hammered). Returns false when the laptop could not
 * answer, so the caller decides between the Turso fallback and an explicit 503. Only JSON is relayed: an HTML
 * error page from the tunnel is a failure, never a "successful" response.
 */
async function forwardToLaptop(req: IncomingMessage, res: ServerResponse, pathAndQuery: string): Promise<boolean> {
  const client = String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim();
  try {
    const upstream = await fetch(new URL(pathAndQuery, laptopOrigin), {
      headers: { [ANALYTICS_KEY_HEADER]: laptopKey!, ...(client ? { [CLIENT_IP_HEADER]: client } : {}), accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(LAPTOP_TIMEOUT_MS),
    });
    const type = upstream.headers.get("content-type") ?? "";
    if (upstream.status >= 500 || !type.includes("application/json")) {
      console.error("Laptop analytics backend failed", upstream.status, type.split(";")[0]);
      await upstream.body?.cancel();
      return false;
    }
    const body = Buffer.from(await upstream.arrayBuffer());
    // The data is immutable between warehouse rebuilds, so the CDN may hold successes; errors are never cached.
    const cache = upstream.status === 200 ? "public, max-age=0, s-maxage=600, stale-while-revalidate=86400" : "no-store";
    const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": cache, "X-CricField-Backend": "laptop" };
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) headers["Retry-After"] = retryAfter;
    res.writeHead(upstream.status, headers);
    res.end(body);
    return true;
  } catch (error) {
    console.error("Laptop analytics backend unreachable", error instanceof Error ? error.name : "Error");
    return false;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const target = new URL(req.url ?? "/", "http://localhost");
  const path = (target.searchParams.get("__warehouseRoute") ?? target.pathname).replace(/\/$/, "");
  target.searchParams.delete("__warehouseRoute");
  req.url = path + target.search;
  // The AI route has its own rate limits and runs locally in the function.
  const isScoutAnalyst = path === "/api/scout/analyst";
  if (path === "/api/scout/analyst/status" && req.method === "GET") return app(req, res);
  if (!isScoutAnalyst && !isAnalyticsPath(path)) return json(res, 404, "not_found");
  const allowedMethod = isScoutAnalyst ? "POST" : "GET";
  if (req.method !== allowedMethod) {
    res.setHeader("Allow", allowedMethod);
    return json(res, 405, "method_not_allowed");
  }

  if (!isScoutAnalyst && laptopEnabled) {
    if (await forwardToLaptop(req, res, req.url)) return;
    if (mode === "laptop" || LAPTOP_ONLY_PATHS.has(path)) return json(res, 503, "analytics_backend_unavailable");
  } else if (LAPTOP_ONLY_PATHS.has(path)) {
    return json(res, 404, "not_found"); // unchanged behaviour: these were never served from the Turso path
  }

  const isScout = isScoutAnalyst || isScoutPath(path);
  if (!isScout && !IPL_PATHS.has(path)) return json(res, 404, "not_found");
  try {
    process.env.CRICFIELD_DB_READONLY = "1";
    process.env.CRICFIELD_SCOUT_DB_PATH = scoutPath;
    process.env.CRICFIELD_DB_PATH = iplPath;
    if (isScout) {
      if (isScoutAnalyst && process.env.AI_ANALYST_ENABLED !== "true") return app(req, res);
      scout ??= configureScout().catch(error => { scout = undefined; throw error; });
      await scout;
    } else {
      ipl ??= configureIpl().catch(error => { ipl = undefined; throw error; });
      await ipl;
    }
    return app(req, res);
  } catch (error) {
    // Messages here are this module's own fixed strings (no secrets), so log them: the bare name hid the cause.
    console.error("Warehouse preview initialization failed", error instanceof Error ? `${error.name}: ${error.message}` : "Error");
    return json(res, 503, isScout ? "global_warehouse_unavailable" : "ipl_warehouse_unavailable");
  }
}
