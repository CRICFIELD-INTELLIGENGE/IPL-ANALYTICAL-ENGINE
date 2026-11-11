import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import { rateLimit } from "./lib/rate-limit";
import { securityHeaders, publicErrorHandler } from "./lib/http-security";

const app: Express = express();
app.disable("x-powered-by");
app.use(securityHeaders);

// Client IPs for rate limiting. Behind a reverse proxy (production hosting) the
// real client is in X-Forwarded-For; trusting it without a proxy would let
// clients spoof their IP, so it is only trusted in production or when set.
const trustProxy = process.env["TRUST_PROXY"];
if (trustProxy !== undefined) {
  app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === "true");
} else if (process.env["NODE_ENV"] === "production") {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS: the site itself is same-origin (the API serves the SPA, and Vite proxies /api
// in development), so it needs no CORS headers. Cross-origin browser access is allowed
// only for origins listed in CORS_ORIGINS (comma-separated) and for localhost during
// development. Non-browser clients are unaffected by CORS.
const allowedOrigins = new Set(
  (process.env["CORS_ORIGINS"] ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin navigation, curl, server-to-server
  if (allowedOrigins.has(origin)) return true;
  return process.env["NODE_ENV"] !== "production" && LOCALHOST_ORIGIN.test(origin);
}
const corsOptions: CorsOptions = {
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
  methods: ["GET", "POST"],
  credentials: false,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Prevent browser from caching API responses — ensures fresh data always loads
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Rate limits. A general ceiling for every API call, and a tighter one for endpoints
// that run heavy SQL or simulations (several seconds each, blocking the event loop).
const envInt = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isInteger(v) && v > 0 ? v : fallback;
};
app.use("/api", rateLimit({ name: "api", max: envInt("RATE_LIMIT_API_PER_MIN", 600), windowMs: 60_000 }));
app.use(
  [
    "/api/stats",
    "/api/ipl/stats",
    "/api/stat-builder",
    "/api/scenario-intelligence",
    "/api/strategy/simulate",
    "/api/alt-universe/simulate",
    "/api/opposition",
    "/api/optimizer/playing-xi",
    "/api/ask",
    "/api/get-clip-route",
    "/api/ipl/sync-csv",
  ],
  rateLimit({ name: "heavy", max: envInt("RATE_LIMIT_HEAVY_PER_MIN", 60), windowMs: 60_000 }),
);

app.use("/api", router);
app.use("/api", (_req, res) => { res.status(404).json({ error: "not_found" }); });

// Serve frontend static distribution if present (SPA fallback).
// import.meta.url works both from source (tsx) and from the esbuild bundle.
const here = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(here, "../../ipl-analytics/dist/public");
if (fs.existsSync(frontendDist)) {
  // The browser reads player identity data from the built copy (dist/public/data), while the API reads the source
  // (ipl-analytics/public/data). A frontend built before a data repair would silently serve the old identities, so
  // warn when the two differ. Fix: rebuild the frontend (pnpm --filter @workspace/ipl-analytics run build).
  const sourceData = path.resolve(here, "../../ipl-analytics/public/data");
  const stale = ["player-bio.json", "squads-by-season.json", "player-recent-matches/index.json"].filter((f) => {
    const a = path.join(sourceData, f), b = path.join(frontendDist, "data", f);
    return fs.existsSync(a) && (!fs.existsSync(b) || !fs.readFileSync(a).equals(fs.readFileSync(b)));
  });
  if (stale.length) {
    logger.warn({ stale, frontendDist }, "Frontend build is older than the source data: these files differ from ipl-analytics/public/data. Rebuild the frontend before serving.");
  }
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use(publicErrorHandler);

export default app;
