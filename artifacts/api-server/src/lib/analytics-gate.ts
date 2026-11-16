// Laptop "analytics gate": when ANALYTICS_GATE_KEY is set, this server answers ONLY the read-only analytics
// allowlist, only to callers presenting the shared key (the Vercel function), only with GET, and with a cap on
// in-flight requests. Everything else gets a JSON 404 — including the SPA, admin, write and AI routes.
// Cloudflare Tunnel itself authenticates nobody; this is the access control.
import { timingSafeEqual, createHash } from "node:crypto";
import fs from "node:fs";
import type { NextFunction, Request, Response } from "express";
import { ANALYTICS_PATHS, ANALYTICS_KEY_HEADER, CLIENT_IP_HEADER } from "./analytics-routes";

const sha = (s: string) => createHash("sha256").update(s).digest();
const startedAt = Date.now();

export function analyticsGate(key: string, opts: { maxInFlight: number; dbPaths: string[] }) {
  if (key.length < 32) throw new Error("ANALYTICS_GATE_KEY must be at least 32 characters");
  const want = sha(key);
  let inFlight = 0;
  let served = 0, rejected = 0, busy = 0;

  const keyOk = (req: Request) => {
    const got = req.get(ANALYTICS_KEY_HEADER);
    return typeof got === "string" && timingSafeEqual(sha(got), want); // hash first: equal lengths, no length leak
  };

  return function gate(req: Request, res: Response, next: NextFunction): void {
    const path = req.path.replace(/\/$/, "");
    // Unauthenticated liveness only: says nothing about data or load.
    if (path === "/api/healthz") { res.json({ status: "ok" }); return; }
    if (!keyOk(req)) { rejected++; res.status(401).json({ error: "unauthorized" }); return; }

    if (path === "/api/analytics/health") {
      const dbs = opts.dbPaths.map(p => ({ file: p.split(/[\\/]/).pop(), present: fs.existsSync(p), bytes: fs.existsSync(p) ? fs.statSync(p).size : 0 }));
      const mem = process.memoryUsage();
      res.json({
        status: dbs.every(d => d.present) ? "ok" : "degraded",
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        inFlight, served, rejected, busy,
        memoryMb: { rss: Math.round(mem.rss / 1048576), heapUsed: Math.round(mem.heapUsed / 1048576) },
        cpuMicros: process.cpuUsage(),
        databases: dbs,
        readOnly: process.env.CRICFIELD_DB_READONLY === "1",
      });
      return;
    }
    if (req.method !== "GET" || !ANALYTICS_PATHS.has(path)) { res.status(404).json({ error: "not_found" }); return; }
    if (req.originalUrl.length > 2048) { res.status(414).json({ error: "query_too_long" }); return; }
    if (inFlight >= opts.maxInFlight) {
      busy++;
      res.setHeader("Retry-After", "5");
      res.status(503).json({ error: "analytics_backend_busy" });
      return;
    }
    // Trusted only after the key check: per-browser rate limiting behind the Vercel proxy.
    const forwarded = req.get(CLIENT_IP_HEADER);
    if (forwarded && /^[0-9a-fA-F:.]{3,45}$/.test(forwarded)) (req as any).clientKey = forwarded;
    inFlight++;
    served++;
    let done = false;
    const release = () => { if (!done) { done = true; inFlight--; } };
    res.on("finish", release);
    res.on("close", release);
    next();
  };
}
