// Admin-only access for maintenance endpoints.
//
// Admin features exist only when ADMIN_API_TOKEN is set (at least 24 characters).
// Callers must send it in the `x-admin-token` header. Without a configured token
// every admin route answers 404, so a default deployment exposes nothing.

import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const MIN_TOKEN_LENGTH = 24;

function configuredToken(): string | null {
  const t = process.env["ADMIN_API_TOKEN"]?.trim() ?? "";
  return t.length >= MIN_TOKEN_LENGTH ? t : null;
}

export function adminEnabled(): boolean {
  return configuredToken() !== null;
}

/** True only when a token is configured and the request carries exactly that token. */
export function isAdminRequest(req: Request): boolean {
  const expected = configuredToken();
  if (!expected) return false;
  const header = req.get("x-admin-token");
  if (typeof header !== "string") return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 404 when admin is disabled (don't advertise the route), 401 when the token is wrong. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!adminEnabled()) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
