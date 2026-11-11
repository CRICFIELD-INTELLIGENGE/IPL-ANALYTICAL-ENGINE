// Minimal in-memory, fixed-window rate limiter (per client IP).
//
// One process only: limits are not shared between autoscaled instances. That is
// acceptable as a first guard against a single client exhausting the server with
// expensive queries; a shared store (e.g. Redis) is needed for multi-instance limits.

import type { NextFunction, Request, Response } from "express";

export interface RateLimitOptions {
  /** Requests allowed per window per client. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Bucket name, so different limiters don't share counters. */
  name: string;
}

interface Bucket { count: number; resetAt: number }

const MAX_TRACKED_CLIENTS = 50_000;

export function rateLimit({ max, windowMs, name }: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";

    let b = buckets.get(key);
    if (!b || now >= b.resetAt) {
      if (!b && buckets.size >= MAX_TRACKED_CLIENTS) {
        // Drop expired entries; if still full, start over rather than grow without bound.
        for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
        if (buckets.size >= MAX_TRACKED_CLIENTS) buckets.clear();
      }
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(key, b);
    }

    b.count += 1;
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - b.count)));

    if (b.count > max) {
      const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "rate_limited", limiter: name, retryAfterSeconds: retryAfter });
      return;
    }
    next();
  };
}
